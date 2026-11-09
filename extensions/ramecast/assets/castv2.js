// Minimal Google Cast v2 client, shared by the extension (src/lib/protocols/castv2.ts) and the
// detached mirroring worker (assets/mirror.js). Plain CommonJS so the worker can run it directly.
//
// A CastMessage is a tiny protobuf sent length-prefixed over TLS:
// 1 protocol_version (varint) 2 source_id 3 destination_id 4 namespace 5 payload_type (varint) 6 payload_utf8
const tls = require("tls");

const NS = {
  connection: "urn:x-cast:com.google.cast.tp.connection",
  heartbeat: "urn:x-cast:com.google.cast.tp.heartbeat",
  receiver: "urn:x-cast:com.google.cast.receiver",
  media: "urn:x-cast:com.google.cast.media",
  webrtc: "urn:x-cast:com.google.cast.webrtc", // Cast Streaming session (OFFER / ANSWER)
};
const SENDER = "sender-0";
const DEFAULT_MEDIA_RECEIVER = "CC1AD845";
const MIRRORING_RECEIVER = "0F5096E8"; // the receiver Chrome uses for tab/screen mirroring

function varint(n) {
  const out = [];
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
  return Buffer.from(out);
}

function encode(destination, namespace, data) {
  const str = (field, s) => {
    const b = Buffer.from(s, "utf8");
    return Buffer.concat([Buffer.from([(field << 3) | 2]), varint(b.length), b]);
  };
  const body = Buffer.concat([
    Buffer.from([0x08, 0x00]), // protocol_version = CASTV2_1_0
    str(2, SENDER),
    str(3, destination),
    str(4, namespace),
    Buffer.from([0x28, 0x00]), // payload_type = STRING
    str(6, JSON.stringify(data)),
  ]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  return Buffer.concat([len, body]);
}

function decode(buf) {
  const fields = {};
  let i = 0;
  const readVarint = () => {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = buf[i++];
      result += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    return result;
  };
  while (i < buf.length) {
    const key = readVarint();
    const field = key >> 3;
    if ((key & 7) === 0) readVarint();
    else if ((key & 7) === 2) {
      const len = readVarint();
      fields[field] = buf.toString("utf8", i, i + len);
      i += len;
    } else break;
  }
  let data = {};
  try {
    data = JSON.parse(fields[6] ?? "{}");
  } catch {
    // binary payloads are ignored
  }
  return { source: fields[2] ?? "", destination: fields[3] ?? "", namespace: fields[4] ?? "", data };
}

class CastClient {
  /** @param {(line: string) => void} [log] optional protocol trace sink */
  constructor(log) {
    this.log = log;
    this.buffer = Buffer.alloc(0);
    this.requestId = 1;
    this.waiters = [];
    this.listeners = [];
    this.closeListeners = [];
  }

  connect(host, port = 8009, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out connecting to ${host}:${port}`)), timeoutMs);
      const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
        clearTimeout(timer);
        this.log?.(`connected to ${host}:${port}`);
        this.send("receiver-0", NS.connection, { type: "CONNECT" });
        this.heartbeat = setInterval(() => this.send("receiver-0", NS.heartbeat, { type: "PING" }), 5000);
        resolve();
      });
      socket.on("error", (e) => {
        clearTimeout(timer);
        this.log?.(`socket error: ${e.message}`);
        reject(e);
      });
      socket.on("close", () => {
        this.log?.("socket closed");
        if (this.heartbeat) clearInterval(this.heartbeat);
        for (const cb of this.closeListeners) cb();
      });
      socket.on("data", (chunk) => this.onData(chunk));
      this.socket = socket;
    });
  }

  close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.closeListeners = [];
    this.socket?.destroy();
  }

  /** Called for every non-heartbeat message, including unsolicited status updates. */
  onMessage(cb) {
    this.listeners.push(cb);
  }

  onClose(cb) {
    this.closeListeners.push(cb);
  }

  send(destination, namespace, data) {
    if (namespace !== NS.heartbeat) this.log?.(`>> ${destination} ${namespace} ${JSON.stringify(data)}`);
    this.socket?.write(encode(destination, namespace, data));
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + len) break;
      const msg = decode(this.buffer.subarray(4, 4 + len));
      this.buffer = this.buffer.subarray(4 + len);
      if (msg.namespace === NS.heartbeat) {
        if (msg.data.type === "PING") this.send(msg.source, NS.heartbeat, { type: "PONG" });
        continue;
      }
      this.log?.(`<< ${msg.source} ${msg.namespace} ${JSON.stringify(msg.data).slice(0, 2000)}`);
      this.waiters = this.waiters.filter((w) => (w.match(msg) ? (w.resolve(msg), false) : true));
      for (const cb of this.listeners) cb(msg);
    }
  }

  /** Wait for the first message matching `match`; resolves with its JSON payload. */
  waitFor(match, label, timeoutMs) {
    return new Promise((resolve, reject) => {
      const waiter = {
        match,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m.data);
        },
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error(`Cast device did not answer ${label}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  /**
   * Send a request and wait for its reply (same requestId). `alsoAccept` lets a broadcast status
   * update count as the answer, for devices that report progress without echoing the requestId.
   */
  request(destination, namespace, data, timeoutMs = 15000, alsoAccept) {
    const requestId = this.requestId++;
    const reply = this.waitFor(
      (m) => m.data.requestId === requestId || !!alsoAccept?.(m),
      String(data.type),
      timeoutMs,
    );
    this.send(destination, namespace, { ...data, requestId });
    return reply;
  }

  async getStatus() {
    const res = await this.request("receiver-0", NS.receiver, { type: "GET_STATUS" });
    return res.status ?? {};
  }

  /** Launch a receiver app (or reuse it if already running); returns { appId, sessionId, transportId }. */
  async launch(appId, timeoutMs = 30000) {
    const find = (status) => status?.applications?.find((a) => a.appId === appId);
    let app = find(await this.getStatus());
    if (!app) {
      const launched = await this.request(
        "receiver-0",
        NS.receiver,
        { type: "LAUNCH", appId },
        timeoutMs,
        (m) => m.data.type === "RECEIVER_STATUS" && !!find(m.data.status),
      );
      if (launched.type !== "RECEIVER_STATUS") throw new Error(`Launch failed: ${launched.reason ?? launched.type}`);
      app = find(launched.status) ?? find(await this.getStatus());
    }
    if (!app) throw new Error("Receiver app did not start on the device");
    this.send(app.transportId, NS.connection, { type: "CONNECT" });
    return app;
  }

  /** Launch the Default Media Receiver and play a URL on it. */
  async loadMedia(media) {
    const app = await this.launch(DEFAULT_MEDIA_RECEIVER);
    const res = await this.request(app.transportId, NS.media, { type: "LOAD", media, autoplay: true }, 30000);
    if (res.type !== "MEDIA_STATUS") throw new Error(`Device refused the stream: ${res.reason ?? res.type}`);
  }

  async stopApps() {
    const { applications } = await this.getStatus();
    for (const app of applications ?? []) {
      await this.request("receiver-0", NS.receiver, { type: "STOP", sessionId: app.sessionId });
    }
  }
}

module.exports = { CastClient, NS, DEFAULT_MEDIA_RECEIVER, MIRRORING_RECEIVER, encode, decode };
