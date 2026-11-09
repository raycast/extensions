// Detached Cast Streaming (screen mirroring) worker: the same protocol Chrome uses for tab/screen casting.
// Usage: node mirror.js <configJson>
//
// 1. Launch the mirroring receiver app on the device and negotiate a stream (OFFER / ANSWER).
// 2. Encode the screen with ffmpeg to raw H.264 or VP8 frames.
// 3. Encrypt each frame (AES-128-CTR), split it into Cast RTP packets and send them over UDP.
// 4. Send RTCP sender reports (needed for playout timing) and resend packets the device reports lost.
//
// Progress is written as JSON to cfg.statusFile: {state: "streaming"} or {state: "error", stage, message}.
const crypto = require("crypto");
const dgram = require("dgram");
const fs = require("fs");
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");
const { CastClient, NS, MIRRORING_RECEIVER } = require("./castv2.js");

const cfg = JSON.parse(process.argv[2]);
const log = (line) => fs.appendFileSync(cfg.castLog, `${new Date().toISOString()} [mirror] ${line}\n`);
const setStatus = (obj) => fs.writeFileSync(cfg.statusFile, JSON.stringify(obj));

// --- Session state ---------------------------------------------------------------------------
// Receiver playout buffer ("target delay"): room for a resend or two on Wi-Fi. In auto mode it starts here
// and is adjusted at runtime (see monitor) via the adaptive playout delay RTP extension.
const AUTO = !!cfg.auto;
let targetDelayMs = cfg.targetDelayMs ?? 200;
const FPS = cfg.fps ?? 30;
const MAX_BITRATE = cfg.maxBitrate ?? 8_000_000;
const MAX_PACKET = 1400; // whole RTP packet; stays under typical MTUs, including VPNs
const RTP_HEADER = 12;
const CAST_HEADER = 7; // flags, frame id, packet id, max packet id, reference frame id
const DELAY_EXTENSION = 4; // adaptive playout delay: type 1, size 2, delay in ms
const MAX_PAYLOAD = MAX_PACKET - RTP_HEADER - CAST_HEADER - DELAY_EXTENSION;
const PAYLOAD_TYPE = 96; // what Chrome uses for video

let stage = "connect";
let streaming = false;
let stopping = false;
let client, session, udp, ffmpeg, srTimer, pacer, tuner, frameWatchdog;

function shutdown(code, reason) {
  if (stopping) return;
  stopping = true;
  log(`shutdown: ${reason}`);
  clearInterval(srTimer);
  clearInterval(pacer);
  clearInterval(tuner);
  clearTimeout(frameWatchdog);
  try {
    ffmpeg?.kill("SIGKILL");
  } catch {
    // already gone
  }
  try {
    if (session) client.send("receiver-0", NS.receiver, { type: "STOP", sessionId: session.sessionId, requestId: 1e6 });
  } catch {
    // connection already gone
  }
  setTimeout(() => {
    client?.close();
    try {
      udp?.close();
    } catch {
      // already closed
    }
    process.exit(code);
  }, 300);
}

function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (!streaming) setStatus({ state: "error", stage, message });
  shutdown(1, `${stage}: ${err instanceof Error ? err.stack : message}`);
}

for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => shutdown(0, sig));
process.on("uncaughtException", fail);
process.on("unhandledRejection", fail);

// --- Crypto: AES-128-CTR per frame; nonce = IV mask XOR frame id (big-endian, bytes 8..11) ------
const aesKey = crypto.randomBytes(16);
const aesIvMask = crypto.randomBytes(16);

function encryptFrame(data, frameId) {
  const iv = Buffer.from(aesIvMask);
  iv[8] ^= (frameId >>> 24) & 0xff;
  iv[9] ^= (frameId >>> 16) & 0xff;
  iv[10] ^= (frameId >>> 8) & 0xff;
  iv[11] ^= frameId & 0xff;
  const cipher = crypto.createCipheriv("aes-128-ctr", aesKey, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

// --- Clock: one monotonic clock for RTP timestamps and the NTP times in sender reports ----------
const rtpBase = crypto.randomInt(0, 2 ** 31);
const rtpAt = (ms) => (rtpBase + Math.round(ms * 90)) >>> 0; // 90 kHz video clock
function ntpAt(ms) {
  const wall = performance.timeOrigin + ms;
  const secs = Math.floor(wall / 1000);
  return { sec: (secs + 2208988800) >>> 0, frac: Math.floor(((wall - secs * 1000) / 1000) * 2 ** 32) >>> 0 };
}

// --- RTP packetizer, pacing and retransmission -------------------------------------------------
// Frames are kept (encrypted) for retransmission and packetized at send time, so a resend always
// follows the current rules (e.g. whether the delay extension may be used).
const ssrc = crypto.randomInt(1, 2 ** 31);
let seq = crypto.randomInt(0, 65536);
let nextFrameId = 0;
let lastAckedFrameId = -1;
let lastAckProgressAt = 0;
let waitForKeyFrame = false;
let packetsSent = 0;
let octetsSent = 0;
let udpPort = 0;
const history = new Map(); // frame id -> { id, payload, isKey, rtpTs, count, delayMs, sentAt, resentAt[] }
const queue = []; // paced send queue of { frame, packetId }

// Adaptive playout delay: announced on the first packet of frames after a change, like Chrome's
// sender, until the receiver acks one of them (or for at most ANNOUNCE_FRAMES frames).
const ANNOUNCE_FRAMES = 30;
let delayChangeFrameId = -1;
let delayExtensionOk = true; // turned off if the receiver stalls right after a change

function buildPacket(frame, p) {
  const ext = p === 0 && frame.delayMs > 0 && delayExtensionOk;
  const header = Buffer.alloc(RTP_HEADER + CAST_HEADER + (ext ? DELAY_EXTENSION : 0));
  header[0] = 0x80; // RTP v2
  header[1] = (p === frame.count - 1 ? 0x80 : 0) | PAYLOAD_TYPE; // marker on the frame's last packet
  header.writeUInt16BE(seq, 2);
  seq = (seq + 1) & 0xffff; // every transmission gets a fresh sequence number
  header.writeUInt32BE(frame.rtpTs, 4);
  header.writeUInt32BE(ssrc, 8);
  header[12] = (frame.isKey ? 0x80 : 0) | 0x40 | (ext ? 1 : 0); // key flag | has reference id | extensions
  header[13] = frame.id & 0xff;
  header.writeUInt16BE(p, 14);
  header.writeUInt16BE(frame.count - 1, 16);
  header[18] = (frame.isKey ? frame.id : frame.id - 1) & 0xff; // what this frame depends on
  if (ext) {
    header.writeUInt16BE((1 << 10) | 2, 19); // extension type 1 (adaptive playout delay), 2 bytes
    header.writeUInt16BE(frame.delayMs, 21);
  }
  return Buffer.concat([header, frame.payload.subarray(p * MAX_PAYLOAD, (p + 1) * MAX_PAYLOAD)]);
}

function sendNow({ frame, packetId }) {
  const packet = buildPacket(frame, packetId);
  udp.send(packet, udpPort, cfg.host);
  packetsSent++;
  octetsSent += packet.length - RTP_HEADER;
  stats.packets++;
}

// Bursting a whole key frame (100+ packets) at once overflows Wi-Fi and receiver buffers, so pace it.
function drain() {
  for (let i = 0; i < 24 && queue.length; i++) sendNow(queue.shift());
}
function startPacer() {
  pacer = setInterval(drain, 2);
}

/** Queue a retransmission, unless that packet was just resent (receivers repeat NACKs every few ms). */
function resend(frame, packetId, now) {
  if (packetId >= frame.count) return;
  if (now - (frame.resentAt[packetId] ?? 0) < 40) return;
  frame.resentAt[packetId] = now;
  queue.unshift({ frame, packetId });
  stats.resent++;
}

function sendFrame(data, isKey, captureMs) {
  // Too far behind the receiver's acks: drop delta frames until the next key frame so the frame-id
  // window (8 bits on the wire) never becomes ambiguous and the decoder restarts cleanly.
  if (lastAckedFrameId >= 0 && nextFrameId - lastAckedFrameId > 90) waitForKeyFrame = true;
  if (waitForKeyFrame && !isKey) return;
  waitForKeyFrame = false;

  const id = nextFrameId++;
  const payload = encryptFrame(data, id);
  const announce =
    delayExtensionOk &&
    delayChangeFrameId >= 0 &&
    lastAckedFrameId < delayChangeFrameId &&
    id - delayChangeFrameId < ANNOUNCE_FRAMES;
  const frame = {
    id,
    payload,
    isKey,
    rtpTs: rtpAt(captureMs),
    count: Math.max(1, Math.ceil(payload.length / MAX_PAYLOAD)),
    delayMs: announce ? targetDelayMs : 0,
    sentAt: performance.now(),
    resentAt: [],
  };
  history.set(id, frame);
  history.delete(id - 200);
  for (let p = 0; p < frame.count; p++) queue.push({ frame, packetId: p });
  drain(); // don't wait for the next pacer tick

  if (!streaming) {
    streaming = true;
    lastAckProgressAt = performance.now();
    clearTimeout(frameWatchdog);
    setStatus({ state: "streaming", codec: cfg.codec });
    log(`first frame sent (${isKey ? "key" : "delta"}, ${data.length} bytes)`);
  }
}

// --- Health monitor and auto latency -----------------------------------------------------------
// Every second: log a stats line, recover from stalls, and (in auto mode) tune the playout delay.
// Raise the delay quickly when the network struggles; lower it slowly once it has been clean.
const AUTO_MIN_MS = 80;
const AUTO_MAX_MS = 600;
const AUTO_CLEAN_MS = cfg.autoCleanMs ?? 10000; // calm period required before lowering
const stats = { ackMs: [], lostKeys: new Set(), packets: 0, resent: 0 };
let lastChangeAt = 0;
let cleanSince = 0;
let stalled = false;

function setTargetDelay(ms, why) {
  const next = Math.round(Math.min(AUTO_MAX_MS, Math.max(AUTO_MIN_MS, ms)));
  if (next === targetDelayMs) return;
  log(`auto latency: ${targetDelayMs} -> ${next} ms (${why})`);
  targetDelayMs = next;
  delayChangeFrameId = nextFrameId;
  lastChangeAt = performance.now();
  setStatus({ state: "streaming", codec: cfg.codec, targetDelayMs });
}

function checkStall(now) {
  const inFlight = nextFrameId - 1 - lastAckedFrameId;
  const silentFor = now - lastAckProgressAt;
  if (inFlight <= 0 || silentFor < Math.max(1000, targetDelayMs * 3)) {
    if (stalled) log(`recovered after stall`);
    stalled = false;
    return;
  }
  if (!stalled) {
    stalled = true;
    log(`stall: no acks for ${Math.round(silentFor)} ms, ${inFlight} frames in flight`);
    // A stall right after a delay change means this receiver can't handle the extension: stop using it.
    if (delayExtensionOk && delayChangeFrameId >= 0 && lastChangeAt >= lastAckProgressAt - 1500) {
      delayExtensionOk = false;
      log("receiver stopped acking after a playout delay change; disabling live delay changes");
      // Every unacked frame that carried the extension needs its first packet again, without it.
      for (let id = lastAckedFrameId + 1; id < nextFrameId; id++) {
        const f = history.get(id);
        if (f?.delayMs > 0) resend(f, 0, now);
      }
    }
  }
  // Resend the next few frames the receiver is waiting for, in full.
  for (let id = lastAckedFrameId + 1; id <= lastAckedFrameId + 5 && id < nextFrameId; id++) {
    const f = history.get(id);
    if (f) for (let p = 0; p < f.count; p++) resend(f, p, now);
  }
}

function monitor() {
  const now = performance.now();
  const acks = stats.ackMs.sort((a, b) => a - b);
  const p95 = acks.length ? acks[Math.min(acks.length - 1, Math.floor(acks.length * 0.95))] : 0;
  const lost = stats.lostKeys.size;
  const lossRate = stats.packets ? lost / stats.packets : 0;
  log(
    `stats: sent ${stats.packets} pkts, ${lost} lost (${(lossRate * 100).toFixed(1)}%), ${stats.resent} resent, ` +
      `acked to #${lastAckedFrameId} of #${nextFrameId - 1}, ack p95 ${Math.round(p95)} ms, delay ${targetDelayMs} ms`,
  );
  stats.ackMs = [];
  stats.lostKeys.clear();
  stats.packets = 0;
  stats.resent = 0;

  checkStall(now);
  if (!AUTO || !delayExtensionOk || stalled || !acks.length) return;

  // Struggling: real loss (not a stray packet) needs round trips to repair; slow acks mean late frames.
  const struggling = (lost >= 3 && lossRate > 0.02) || p95 > targetDelayMs * 0.6;
  if (struggling) {
    cleanSince = now;
    if (now - lastChangeAt < 2000) return;
    setTargetDelay(
      Math.max(targetDelayMs * 1.5, p95 * 2 + 40),
      `${lost} lost packets (${(lossRate * 100).toFixed(1)}%), ack p95 ${Math.round(p95)} ms`,
    );
    return;
  }
  if (!cleanSince) cleanSince = now;
  if (now - cleanSince >= AUTO_CLEAN_MS && now - lastChangeAt >= 2000 && p95 < targetDelayMs * 0.3) {
    setTargetDelay(Math.max(targetDelayMs * 0.8, p95 * 2 + 40), `clean for ${Math.round((now - cleanSince) / 1000)} s`);
    cleanSince = now; // require another calm period before the next step down
  }
}

/** Map an 8-bit frame id from the receiver to the most recent full frame id with those bits. */
const expandFrameId = (low8) => nextFrameId - 1 - ((nextFrameId - 1 - low8) & 0xff);

function onRtcp(msg) {
  let off = 0;
  while (off + 4 <= msg.length) {
    const fmt = msg[off] & 0x1f;
    const pt = msg[off + 1];
    const len = (msg.readUInt16BE(off + 2) + 1) * 4;
    const pkt = msg.subarray(off, off + len);
    off += len;
    // Cast feedback: PSFB (206), FMT 15, identifier "CAST": ack checkpoint + list of lost packets.
    if (pt === 206 && fmt === 15 && pkt.length >= 20 && pkt.toString("ascii", 12, 16) === "CAST") {
      const acked = expandFrameId(pkt[16]);
      const now = performance.now();
      if (acked > lastAckedFrameId) {
        for (let id = lastAckedFrameId + 1; id <= acked; id++) {
          const f = history.get(id);
          if (f) stats.ackMs.push(now - f.sentAt);
        }
        lastAckedFrameId = acked;
        lastAckProgressAt = now;
      }
      const losses = pkt[17];
      for (let i = 0; i < losses && 20 + i * 4 + 4 <= pkt.length; i++) {
        const at = 20 + i * 4;
        const frame = history.get(expandFrameId(pkt[at]));
        if (!frame) continue;
        const packetId = pkt.readUInt16BE(at + 1);
        const mask = pkt[at + 3];
        const ids = [];
        if (packetId === 0xffff) for (let p = 0; p < frame.count; p++) ids.push(p);
        else {
          ids.push(packetId);
          for (let b = 0; b < 8; b++) if (mask & (1 << b)) ids.push(packetId + 1 + b);
        }
        for (const id of ids) {
          stats.lostKeys.add(`${frame.id}:${id}`);
          resend(frame, id, now);
        }
      }
    } else if (pt === 206 && fmt === 1) {
      log("receiver asked for a key frame (next one arrives within 2 s)");
    }
  }
}

function sendSenderReport() {
  const now = performance.now();
  const { sec, frac } = ntpAt(now);
  const sr = Buffer.alloc(28);
  sr[0] = 0x80;
  sr[1] = 200; // SR
  sr.writeUInt16BE(6, 2); // length in 32-bit words minus one
  sr.writeUInt32BE(ssrc, 4);
  sr.writeUInt32BE(sec, 8);
  sr.writeUInt32BE(frac, 12);
  sr.writeUInt32BE(rtpAt(now), 16);
  sr.writeUInt32BE(packetsSent >>> 0, 20);
  sr.writeUInt32BE(octetsSent >>> 0, 24);
  udp.send(sr, udpPort, cfg.host);
}

// --- Encoder: ffmpeg -> raw frames on stdout -----------------------------------------------------
/**
 * Read H.264 from an FLV stream. Unlike raw Annex B, FLV gives each frame's length up front, so a
 * frame can be sent the moment it's encoded instead of when the next one starts (saves a frame).
 * Frames are converted to Annex B, with SPS/PPS in front of every key frame.
 */
function flvH264Reader(onFrame) {
  let buf = Buffer.alloc(0);
  let headerDone = false;
  let lengthSize = 4;
  let paramSets = Buffer.alloc(0);
  const START = Buffer.from([0, 0, 0, 1]);

  const onVideoTag = (data) => {
    if ((data[0] & 0x0f) !== 7) return; // not AVC
    const isKey = data[0] >> 4 === 1;
    if (data[1] === 0) {
      // AVCDecoderConfigurationRecord
      lengthSize = (data[5 + 4] & 3) + 1;
      const sets = [];
      let i = 5 + 5;
      for (const count of ["sps", "pps"]) {
        const n = count === "sps" ? data[i++] & 0x1f : data[i++];
        for (let k = 0; k < n; k++) {
          const len = data.readUInt16BE(i);
          sets.push(START, data.subarray(i + 2, i + 2 + len));
          i += 2 + len;
        }
      }
      paramSets = Buffer.concat(sets);
      return;
    }
    if (data[1] !== 1) return;
    const nalus = [];
    for (let i = 5; i + lengthSize <= data.length;) {
      const len = data.readUIntBE(i, lengthSize);
      nalus.push(START, data.subarray(i + lengthSize, i + lengthSize + len));
      i += lengthSize + len;
    }
    onFrame(Buffer.concat(isKey ? [paramSets, ...nalus] : nalus), isKey);
  };

  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (!headerDone) {
      if (buf.length < 13) return;
      buf = buf.subarray(buf.readUInt32BE(5) + 4); // FLV header + PreviousTagSize0
      headerDone = true;
    }
    while (buf.length >= 11) {
      const size = buf.readUIntBE(1, 3);
      if (buf.length < 11 + size + 4) break;
      if (buf[0] === 9) onVideoTag(buf.subarray(11, 11 + size));
      buf = buf.subarray(11 + size + 4);
    }
  };
}

/** Split an IVF (VP8) stream into frames. */
function ivfSplitter(onFrame) {
  let buf = Buffer.alloc(0);
  let headerDone = false;
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (!headerDone) {
      if (buf.length < 32) return;
      buf = buf.subarray(buf.readUInt16LE(6)); // header length
      headerDone = true;
    }
    while (buf.length >= 12) {
      const size = buf.readUInt32LE(0);
      if (buf.length < 12 + size) break;
      const frame = Buffer.from(buf.subarray(12, 12 + size));
      buf = buf.subarray(12 + size);
      onFrame(frame, (frame[0] & 1) === 0); // VP8: bit 0 of the frame tag is 0 for key frames
    }
  };
}

function encoderArgs(codec, hardware) {
  const kbps = Math.round(MAX_BITRATE / 1000);
  const gop = String(FPS * 2);
  if (codec === "vp8") {
    return [
      "-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8",
      "-b:v", `${kbps}k`, "-maxrate", `${kbps}k`, "-bufsize", `${Math.round(kbps / 2)}k`,
      "-g", gop, "-auto-alt-ref", "0", "-lag-in-frames", "0", "-error-resilient", "1",
      "-f", "ivf", "-flush_packets", "1", "pipe:1",
    ]; // prettier-ignore
  }
  const encoder = hardware
    ? // VideoToolbox: hardware encoder, no B-frames (each frame references only the previous one)
      ["-c:v", "h264_videotoolbox", "-realtime", "1", "-prio_speed", "1", "-profile:v", "main", "-bf", "0", "-b:v", `${kbps}k`]
    : ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-profile:v", "baseline",
       "-b:v", `${kbps}k`, "-maxrate", `${kbps}k`, "-bufsize", `${Math.round(kbps / 2)}k`]; // prettier-ignore
  return [...encoder, "-g", gop, "-f", "flv", "-flvflags", "no_duration_filesize", "-flush_packets", "1", "pipe:1"];
}

/** Start ffmpeg. On macOS H.264 uses the hardware encoder first and falls back to x264 if it fails. */
function startEncoder(codec, hardware = codec === "h264" && process.platform === "darwin", retry = false) {
  const args = [
    "-hide_banner", "-nostats",
    "-fflags", "nobuffer", "-flags", "low_delay", "-probesize", "32", "-analyzeduration", "0",
    ...cfg.captureArgs,
    "-vf", `fps=${FPS},scale=-2:1080:flags=fast_bilinear,format=yuv420p`, "-r", String(FPS),
    ...encoderArgs(codec, hardware),
  ]; // prettier-ignore
  log(
    `encoder: ${codec} ${hardware ? "hardware" : "software"} ${FPS} fps, target delay ${targetDelayMs} ms${AUTO ? " (auto)" : ""}`,
  );
  const logFd = fs.openSync(cfg.ffmpegLog, retry ? "a" : "w");
  const proc = spawn(cfg.ffmpeg, args, { stdio: ["ignore", "pipe", logFd] });
  ffmpeg = proc;
  let gotFrame = false;

  const fallBack = (why) => {
    if (!hardware || gotFrame || stopping) return false;
    log(`hardware encoder unavailable (${why}), using software`);
    clearTimeout(hwTimer);
    proc.removeAllListeners("exit");
    proc.kill("SIGKILL");
    startEncoder(codec, false, true);
    return true;
  };
  const hwTimer = hardware ? setTimeout(() => fallBack("no frames after 5 s"), 5000) : undefined;

  const read = (codec === "vp8" ? ivfSplitter : flvH264Reader)((frame, isKey) => {
    gotFrame = true;
    clearTimeout(hwTimer);
    sendFrame(frame, isKey, performance.now());
  });
  proc.stdout.on("data", read);
  proc.on("exit", (code, signal) => {
    clearTimeout(hwTimer);
    fs.appendFileSync(cfg.ffmpegLog, `\n[ffmpeg exited: code=${code} signal=${signal}]\n`);
    if (fallBack(`exited with code ${code}`)) return;
    stage = "capture";
    if (!streaming) fail(new Error("ffmpeg exited before producing frames"));
    else shutdown(0, "ffmpeg exited");
  });
  if (!retry) {
    frameWatchdog = setTimeout(() => {
      stage = "capture";
      fail(new Error("no screen frames"));
    }, 20000);
  }
}

// --- Main ----------------------------------------------------------------------------------------
async function main() {
  client = new CastClient(log);
  await client.connect(cfg.host, cfg.port);
  client.onClose(() => shutdown(0, "cast connection closed"));

  stage = "launch";
  session = await client.launch(MIRRORING_RECEIVER);
  client.onMessage((m) => {
    if (m.namespace === NS.receiver && m.data.type === "RECEIVER_STATUS") {
      const apps = m.data.status?.applications ?? [];
      if (!apps.some((a) => a.sessionId === session.sessionId)) shutdown(0, "mirroring app closed on the device");
    }
    if (m.source === session.transportId && m.namespace === NS.connection && m.data.type === "CLOSE") {
      shutdown(0, "receiver closed the connection");
    }
  });

  stage = "offer";
  const common = {
    type: "video_source",
    rtpProfile: "cast",
    rtpPayloadType: PAYLOAD_TYPE,
    ssrc,
    maxFrameRate: `${FPS * 1000}/1000`,
    timeBase: "1/90000",
    maxBitRate: MAX_BITRATE,
    targetDelay: targetDelayMs,
    aesKey: aesKey.toString("hex"),
    aesIvMask: aesIvMask.toString("hex"),
    resolutions: [{ width: 1920, height: 1080 }],
    receiverRtcpEventLog: false,
    rtpExtensions: ["adaptive_playout_delay"],
  };
  const streams = [
    { index: 0, codecName: "h264", ...common },
    { index: 1, codecName: "vp8", ...common },
  ];
  const seqNum = crypto.randomInt(1, 1e9);
  const reply = client.waitFor(
    (m) => m.namespace === NS.webrtc && m.data.type === "ANSWER" && m.data.seqNum === seqNum,
    "the stream offer",
    15000,
  );
  client.send(session.transportId, NS.webrtc, {
    type: "OFFER",
    seqNum,
    offer: { castMode: "mirroring", receiverGetStatus: true, supportedStreams: streams },
  });
  const answer = await reply;
  if (answer.result !== "ok" || !answer.answer) {
    throw new Error(`Device rejected the stream: ${JSON.stringify(answer.error ?? answer.result)}`);
  }
  const chosen = streams.find((s) => s.index === answer.answer.sendIndexes?.[0]);
  if (!chosen) throw new Error("Device accepted no video stream");
  udpPort = answer.answer.udpPort;
  cfg.codec = chosen.codecName;
  log(`answer: codec=${chosen.codecName} udpPort=${udpPort}`);

  stage = "stream";
  udp = dgram.createSocket("udp4");
  udp.on("message", onRtcp);
  udp.on("error", (e) => log(`udp error: ${e.message}`));
  await new Promise((resolve) => udp.bind(0, cfg.bindIp, resolve));
  udp.setSendBufferSize(1 << 20);
  startPacer();
  sendSenderReport();
  srTimer = setInterval(sendSenderReport, 500);
  tuner = setInterval(monitor, 1000);
  startEncoder(chosen.codecName);
}

main().catch(fail);
