"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/command-runner.ts
function setCancellationCheck(check) {
  cancellationCheck = check;
}
function isCancellationRequested() {
  return !!cancellationCheck?.();
}
async function runCommand(file, args2, options = {}) {
  const { timeout = 0, onStderrLine, ...rest } = options;
  let commandRef;
  let killedByDeadline = false;
  const timer = timeout > 0 ? setTimeout(() => {
    killedByDeadline = true;
    commandRef?.child.kill("SIGKILL");
  }, timeout) : void 0;
  try {
    if (cancellationCheck?.()) throw new Error("Task stopped manually");
    const command = execute(file, args2, { ...rest, encoding: "utf8", timeout: 0 });
    commandRef = command;
    if (onStderrLine && command.child.stderr) {
      let pending = "";
      command.child.stderr.on("data", (chunk) => {
        pending += chunk.toString();
        const lines = pending.split("\n");
        pending = lines.pop() || "";
        for (const line of lines) onStderrLine(line);
      });
    }
    const poll = setInterval(() => {
      if (cancellationCheck?.()) command.child.kill("SIGKILL");
    }, 250);
    try {
      const result = await command;
      if (cancellationCheck?.()) throw new Error("Task stopped manually");
      return result;
    } catch (error) {
      if (cancellationCheck?.()) throw new Error("Task stopped manually");
      if (killedByDeadline)
        throw new Error(
          `Step timed out after ${Math.round(timeout / 1e3)} seconds and was stopped so the task wouldn't hang.`
        );
      throw error;
    } finally {
      clearInterval(poll);
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
var import_node_child_process, import_node_util, execute, cancellationCheck;
var init_command_runner = __esm({
  "src/lib/command-runner.ts"() {
    "use strict";
    import_node_child_process = require("node:child_process");
    import_node_util = require("node:util");
    execute = (0, import_node_util.promisify)(import_node_child_process.execFile);
  }
});

// src/lib/hdr-overlay.ts
var hdr_overlay_exports = {};
__export(hdr_overlay_exports, {
  compositeCapturePng: () => compositeCapturePng,
  pngSize: () => pngSize
});
function encodePq(linear) {
  const p = Math.pow(Math.max(0, Math.min(1, linear)), M1);
  return Math.round(MAX * Math.pow((C1 + C2 * p) / (1 + C3 * p), M2));
}
function decodePq(code) {
  const p = Math.pow(code / MAX, 1 / M2);
  return Math.pow(Math.max(p - C1, 0) / (C2 - C3 * p), 1 / M1);
}
function tagPqPng(filename) {
  const png = import_node_fs11.default.readFileSync(filename);
  const chunk = Buffer.from([0, 0, 0, 4, 99, 73, 67, 80, 9, 16, 0, 1, 0, 0, 0, 0]);
  let crc = 4294967295;
  for (const byte of chunk.subarray(4, 12)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
  }
  chunk.writeUInt32BE((crc ^ 4294967295) >>> 0, 12);
  const parts = [png.subarray(0, 8)];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset) + 12;
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (!["cICP", "iCCP", "sRGB", "gAMA", "cHRM"].includes(type)) {
      parts.push(png.subarray(offset, offset + length));
    }
    if (type === "IHDR") parts.push(chunk);
    offset += length;
  }
  import_node_fs11.default.writeFileSync(filename, Buffer.concat(parts));
}
function pngSize(filename) {
  const header = Buffer.alloc(25);
  const fd = import_node_fs11.default.openSync(filename, "r");
  try {
    if (import_node_fs11.default.readSync(fd, header, 0, header.length, 0) !== header.length || header.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || header.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error(`Invalid PNG overlay: ${import_node_path11.default.basename(filename)}`);
    }
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20), bitDepth: header[24] };
  } finally {
    import_node_fs11.default.closeSync(fd);
  }
}
async function compositeCapturePng(options) {
  const { ffmpegPath, env, width, height, barPad, isPq } = options;
  const outputDir = import_node_path11.default.dirname(options.outputPath);
  const largestOverlayBytes = options.overlays.reduce((largest, overlay) => {
    const size = pngSize(overlay.path);
    return Math.max(largest, size.width * size.height * 8);
  }, 0);
  const requiredBytes = width * (height + barPad * 2) * 12 + largestOverlayBytes + 32 * 1024 * 1024;
  const space = import_node_fs11.default.statfsSync(outputDir);
  if (space.bavail * space.bsize < requiredBytes) throw new Error("Insufficient free space for subtitle compositing");
  const tempDir = import_node_fs11.default.mkdtempSync(import_node_path11.default.join(outputDir, ".framecraft-overlay-"));
  const run = (args2) => runCommand(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args2], { env, timeout: 3e4 });
  try {
    const backgroundRaw = import_node_path11.default.join(tempDir, "background.rgb");
    await run(["-i", options.backgroundPath, "-frames:v", "1", "-pix_fmt", "rgb48le", "-f", "rawvideo", backgroundRaw]);
    const background = import_node_fs11.default.readFileSync(backgroundRaw);
    if (background.length !== width * height * 6) throw new Error("Background PNG dimensions do not match capture");
    const totalHeight = height + barPad * 2;
    const result = Buffer.alloc(width * totalHeight * 6);
    background.copy(result, barPad * width * 6);
    const pq = isPq ? Float64Array.from({ length: MAX + 1 }, (_, code) => decodePq(code)) : void 0;
    const srgb = isPq ? Float64Array.from({ length: MAX + 1 }, (_, code) => {
      const v = code / MAX;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }) : void 0;
    for (const overlay of options.overlays) {
      const size = pngSize(overlay.path);
      const overlayRaw = import_node_path11.default.join(tempDir, "overlay.rgba");
      const eightBit = size.bitDepth <= 8;
      await run([
        "-i",
        overlay.path,
        "-frames:v",
        "1",
        "-pix_fmt",
        eightBit ? "rgba" : "rgba64le",
        "-f",
        "rawvideo",
        overlayRaw
      ]);
      const decoded = import_node_fs11.default.readFileSync(overlayRaw);
      const pixels = eightBit ? Buffer.alloc(decoded.length * 2) : decoded;
      if (eightBit) {
        for (let i = 0; i < decoded.length; i++) pixels.writeUInt16LE(decoded[i] * 257, i * 2);
      }
      if (pixels.length !== size.width * size.height * 8) throw new Error("Invalid decoded overlay size");
      const palette = /* @__PURE__ */ new Map();
      const offsetY = Math.round(overlay.y);
      for (let y = Math.max(0, -offsetY); y < Math.min(size.height, totalHeight - offsetY); y++) {
        for (let x = 0; x < Math.min(width, size.width); x++) {
          const src = (y * size.width + x) * 8;
          const alphaCode = pixels.readUInt16LE(src + 6);
          if (alphaCode === 0) continue;
          const dst = ((y + offsetY) * width + x) * 6;
          const alpha = alphaCode / MAX;
          const r = pixels.readUInt16LE(src);
          const g = pixels.readUInt16LE(src + 2);
          const b = pixels.readUInt16LE(src + 4);
          if (pq && srgb) {
            const key = r * 4294967296 + g * 65536 + b;
            let linear = palette.get(key);
            if (!linear) {
              const lr = srgb[r], lg = srgb[g], lb = srgb[b];
              linear = [
                (0.6274038959 * lr + 0.3292830384 * lg + 0.0433130657 * lb) * 0.0203,
                (0.0690972894 * lr + 0.9195403951 * lg + 0.0113623156 * lb) * 0.0203,
                (0.0163914389 * lr + 0.0880133079 * lg + 0.8955952532 * lb) * 0.0203
              ];
              palette.set(key, linear);
            }
            for (let channel = 0; channel < 3; channel++) {
              const at = dst + channel * 2;
              const mixed = alpha === 1 ? linear[channel] : linear[channel] * alpha + pq[result.readUInt16LE(at)] * (1 - alpha);
              result.writeUInt16LE(encodePq(mixed), at);
            }
          } else {
            for (let channel = 0; channel < 3; channel++) {
              const at = dst + channel * 2;
              result.writeUInt16LE(
                Math.round(pixels.readUInt16LE(src + channel * 2) * alpha + result.readUInt16LE(at) * (1 - alpha)),
                at
              );
            }
          }
        }
      }
    }
    import_node_fs11.default.writeFileSync(backgroundRaw, result);
    const tags = [];
    for (const [flag, value] of [
      ["-color_primaries", options.colorPrimaries],
      ["-color_trc", options.colorTransfer],
      ["-colorspace", options.colorSpace]
    ]) {
      if (value && value !== "unknown") tags.push(flag, value);
    }
    await run([
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgb48le",
      "-video_size",
      `${width}x${totalHeight}`,
      "-i",
      backgroundRaw,
      "-frames:v",
      "1",
      "-pix_fmt",
      "rgb48be",
      ...tags,
      options.outputPath
    ]);
    if (isPq) tagPqPng(options.outputPath);
  } finally {
    import_node_fs11.default.rmSync(tempDir, { recursive: true, force: true });
  }
}
var import_node_fs11, import_node_path11, MAX, M1, M2, C1, C2, C3;
var init_hdr_overlay = __esm({
  "src/lib/hdr-overlay.ts"() {
    "use strict";
    import_node_fs11 = __toESM(require("node:fs"));
    import_node_path11 = __toESM(require("node:path"));
    init_command_runner();
    MAX = 65535;
    M1 = 2610 / 16384;
    M2 = 2523 / 32;
    C1 = 3424 / 4096;
    C2 = 2413 / 128;
    C3 = 2392 / 128;
  }
});

// src/worker/worker-entry.ts
var import_node_fs15 = __toESM(require("node:fs"));
var import_node_os = __toESM(require("node:os"));

// src/lib/storage-maintenance.ts
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_path5 = __toESM(require("node:path"));

// src/lib/segment-cache.ts
var import_node_crypto = require("node:crypto");
var import_node_child_process2 = require("node:child_process");
var import_promises = __toESM(require("node:fs/promises"));
var import_node_path = __toESM(require("node:path"));
init_command_runner();
var MAX_CACHE_BYTES = 4096 * 1024 * 1024;
var MAX_SEGMENT_BYTES = 2048 * 1024 * 1024;
var TTL_MS = 10 * 60 * 1e3;
function segmentCacheKey(identity) {
  const stable = {
    server: identity.server.replace(/\/+$/, ""),
    source: identity.source,
    itemId: identity.itemId || void 0,
    mediaSourceId: identity.mediaSourceId || void 0,
    url: identity.itemId || identity.mediaSourceId ? void 0 : identity.url,
    playlist: identity.playlist,
    disc: identity.disc,
    // Bump when the title→source clock mapping changes so stale offsets are never reused.
    clock: "container-start-v2"
  };
  return (0, import_node_crypto.createHash)("sha256").update(JSON.stringify(stable)).digest("hex");
}
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}
var localTail = Promise.resolve();
async function locked(root, action) {
  const previous = localTail;
  let unlock;
  localTail = new Promise((resolve) => {
    unlock = resolve;
  });
  await previous;
  const lock = import_node_path.default.join(root, ".lock");
  let acquired = false;
  try {
    await import_promises.default.mkdir(root, { recursive: true, mode: 448 });
    const deadline = Date.now() + 1e4;
    while (!acquired) {
      try {
        (0, import_node_child_process2.execFileSync)("/usr/bin/shlock", ["-f", lock, "-p", String(process.pid)], { stdio: "ignore" });
        acquired = true;
      } catch {
        if (Date.now() >= deadline) throw new Error("Local segment cache is busy.");
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }
    return await action();
  } finally {
    try {
      if (acquired) await import_promises.default.rm(lock, { force: true });
    } finally {
      unlock();
    }
  }
}
var SegmentCache = class {
  root;
  constructor(supportPath) {
    this.root = import_node_path.default.join(supportPath, "segment-cache-v1");
  }
  async entries() {
    const entries = [];
    for (const id of await import_promises.default.readdir(this.root)) {
      if (!/^[a-f0-9]{32}$/.test(id)) continue;
      const dir = import_node_path.default.join(this.root, id);
      let pinned = false;
      for (const name of await import_promises.default.readdir(dir)) {
        const match = /^pin-(\d+)-/.exec(name);
        if (!match) continue;
        if (alive(Number(match[1]))) pinned = true;
        else await import_promises.default.rm(import_node_path.default.join(dir, name), { force: true });
      }
      try {
        const m = JSON.parse(await import_promises.default.readFile(import_node_path.default.join(dir, "manifest.json"), "utf8"));
        const stat = await import_promises.default.stat(import_node_path.default.join(dir, `media${m.extension}`));
        if (m.version !== 1 || !/^[a-f0-9]{64}$/.test(m.key) || ![".ts", ".mkv"].includes(m.extension) || ![m.bytes, m.createdAt, m.accessedAt, m.firstPts, m.lastPts, m.sourceOffset, m.titleStart, m.titleEnd].every(
          Number.isFinite
        ) || !stat.isFile() || stat.size !== m.bytes || m.bytes <= 0 || m.bytes > MAX_CACHE_BYTES || m.firstPts >= m.lastPts || m.titleStart >= m.titleEnd)
          throw new Error("Invalid cache manifest");
        if (Date.now() - m.createdAt >= TTL_MS && !pinned) await import_promises.default.rm(dir, { recursive: true, force: true });
        else entries.push({ id, manifest: m, pinned });
      } catch {
        if (!pinned) await import_promises.default.rm(dir, { recursive: true, force: true });
      }
    }
    let total = entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
    for (const entry of entries.filter((e) => !e.pinned).sort((a, b) => a.manifest.accessedAt - b.manifest.accessedAt)) {
      if (total <= MAX_CACHE_BYTES) break;
      await import_promises.default.rm(import_node_path.default.join(this.root, entry.id), { recursive: true, force: true });
      total -= entry.manifest.bytes;
      entries.splice(entries.indexOf(entry), 1);
    }
    return entries;
  }
  async pin(id, manifest, titleTarget) {
    const dir = import_node_path.default.join(this.root, id);
    const pin = import_node_path.default.join(dir, `pin-${process.pid}-${(0, import_node_crypto.randomUUID)()}`);
    await import_promises.default.writeFile(pin, "", { flag: "wx" });
    manifest.accessedAt = Date.now();
    const temporary = import_node_path.default.join(dir, "manifest.tmp");
    await import_promises.default.writeFile(temporary, JSON.stringify(manifest));
    await import_promises.default.rename(temporary, import_node_path.default.join(dir, "manifest.json"));
    let released = false;
    return {
      subtitleLanguages: manifest.subtitleLanguages,
      mediaPath: import_node_path.default.join(dir, `media${manifest.extension}`),
      targetSec: titleTarget + manifest.sourceOffset,
      coarseSec: Math.max(manifest.firstPts, titleTarget + manifest.sourceOffset - 8),
      release: async () => {
        if (released) return;
        await locked(this.root, async () => {
          await import_promises.default.rm(pin, { force: true });
          await this.entries();
        });
        released = true;
      }
    };
  }
  async prune() {
    await locked(this.root, async () => {
      await this.entries();
    });
  }
  async clearUnused() {
    return locked(this.root, async () => {
      const before = (await import_promises.default.readdir(this.root)).filter((id) => /^[a-f0-9]{32}$/.test(id));
      let beforeBytes = 0;
      for (const id of before)
        for (const extension of [".ts", ".mkv"]) {
          try {
            beforeBytes += (await import_promises.default.stat(import_node_path.default.join(this.root, id, `media${extension}`))).size;
          } catch {
          }
        }
      const entries = await this.entries();
      let freed = beforeBytes - entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
      for (const entry of entries)
        if (!entry.pinned) {
          await import_promises.default.rm(import_node_path.default.join(this.root, entry.id), { recursive: true, force: true });
          freed += entry.manifest.bytes;
        }
      return freed;
    });
  }
  async find(key, titleTarget) {
    return locked(this.root, async () => {
      const entries = await this.entries();
      const hit = entries.filter(
        ({ manifest: m }) => m.key === key && Date.now() - m.createdAt < TTL_MS && m.titleStart <= Math.max(0, titleTarget - 8) && m.titleEnd >= titleTarget + 1
      ).sort((a, b) => b.manifest.accessedAt - a.manifest.accessedAt)[0];
      return hit ? this.pin(hit.id, hit.manifest, titleTarget) : void 0;
    });
  }
  /** Decode the small fragment to measure actual video bounds, not container duration/subtitle tails.
   * titleStart/titleEnd must stay within the one ISO playitem whose linear mapping is known.
   */
  async store(input) {
    const stat = await import_promises.default.stat(input.mediaPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_CACHE_BYTES) return void 0;
    const { stdout } = await runCommand(
      input.ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_packets",
        "-show_entries",
        "packet=pts_time",
        "-of",
        "json",
        input.mediaPath
      ],
      { env: input.env, timeout: input.timeoutMs ?? 9e4, maxBuffer: 32 * 1024 * 1024 }
    );
    const packets = JSON.parse(stdout).packets;
    const pts = (packets ?? []).map((packet) => Number(packet.pts_time)).filter(Number.isFinite);
    if (pts.length < 2) return void 0;
    const firstPts = pts.reduce((a, b) => Math.min(a, b), Infinity);
    const lastPts = pts.reduce((a, b) => Math.max(a, b), -Infinity);
    const sourceOffset = input.sourceTarget - input.titleTarget;
    if (!Number.isFinite(sourceOffset) || firstPts > Math.max(0, input.titleTarget - 8) + sourceOffset || lastPts < input.sourceTarget + 1 || lastPts - firstPts > 120)
      return void 0;
    const subtitleLanguages = input.subtitleLanguages?.filter(
      (entry) => Number.isInteger(entry.pid) && entry.pid >= 0 && entry.pid <= 8191 && /^[A-Za-z]{2,3}$/.test(entry.language)
    ).slice(0, 128);
    const manifest = {
      subtitleLanguages,
      version: 1,
      key: input.key,
      extension: import_node_path.default.extname(input.mediaPath) === ".ts" ? ".ts" : ".mkv",
      bytes: stat.size,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      firstPts,
      lastPts,
      sourceOffset,
      titleStart: Math.max(firstPts - sourceOffset, input.titleStart ?? 0),
      titleEnd: Math.min(lastPts - sourceOffset, input.titleEnd ?? Infinity)
    };
    return locked(this.root, async () => {
      const entries = await this.entries();
      let bytes = entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
      for (const entry of entries.filter((e) => !e.pinned).sort((a, b) => a.manifest.accessedAt - b.manifest.accessedAt)) {
        if (bytes + stat.size <= MAX_CACHE_BYTES) break;
        await import_promises.default.rm(import_node_path.default.join(this.root, entry.id), { recursive: true, force: true });
        bytes -= entry.manifest.bytes;
      }
      if (bytes + stat.size > MAX_CACHE_BYTES) return void 0;
      const id = (0, import_node_crypto.randomUUID)().replace(/-/g, "");
      const dir = import_node_path.default.join(this.root, id);
      await import_promises.default.mkdir(dir, { mode: 448 });
      try {
        await import_promises.default.rename(input.mediaPath, import_node_path.default.join(dir, `media${manifest.extension}`));
        await import_promises.default.writeFile(import_node_path.default.join(dir, "manifest.json"), JSON.stringify(manifest));
        return await this.pin(id, manifest, input.titleTarget);
      } catch (error) {
        await import_promises.default.rename(import_node_path.default.join(dir, `media${manifest.extension}`), input.mediaPath).catch(() => void 0);
        await import_promises.default.rm(dir, { recursive: true, force: true });
        throw error;
      }
    });
  }
};

// src/lib/export-sync.ts
var import_node_fs = __toESM(require("node:fs"));
function signature(file) {
  try {
    const stat = import_node_fs.default.statSync(file);
    return stat.isFile() ? `${stat.size}:${stat.mtimeMs}` : void 0;
  } catch {
    return void 0;
  }
}
function exportSignatures(entry) {
  const result = {};
  for (const file of [entry.cleanPngPath, entry.subbedPngPath, entry.layeredSvgPath, entry.clipMkvPath]) {
    if (!file) continue;
    const value = signature(file);
    if (value) result[file] = value;
  }
  return result;
}
function syncExportEntry(entry) {
  if (entry.status === "failed") return entry;
  const files2 = [entry.cleanPngPath, entry.subbedPngPath, entry.layeredSvgPath, entry.clipMkvPath].filter(
    (file) => !!file
  );
  if (!files2.length) return entry;
  let baseline = entry.exportSignatures;
  if (entry.manifestPath) {
    try {
      baseline = JSON.parse(import_node_fs.default.readFileSync(entry.manifestPath, "utf8")).exportSignatures || baseline;
    } catch {
    }
  }
  const live = exportSignatures(entry);
  if (!Object.keys(live).length) return void 0;
  const missing = files2.filter((file) => !live[file]);
  const modified = !!baseline && Object.entries(live).some(([file, value]) => baseline?.[file] !== value);
  return {
    ...entry,
    exportSignatures: baseline || live,
    exportState: { modified, missing },
    cleanPngPath: entry.cleanPngPath && live[entry.cleanPngPath] ? entry.cleanPngPath : void 0,
    subbedPngPath: entry.subbedPngPath && live[entry.subbedPngPath] ? entry.subbedPngPath : void 0,
    layeredSvgPath: entry.layeredSvgPath && live[entry.layeredSvgPath] ? entry.layeredSvgPath : void 0,
    clipMkvPath: entry.clipMkvPath && live[entry.clipMkvPath] ? entry.clipMkvPath : void 0
  };
}

// src/lib/queue.ts
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));

// src/lib/env.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));
var NODE_CANDIDATES = [process.execPath, "/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];
function buildExecutionEnv(bypassProxy) {
  const env = {
    ...process.env,
    PATH: ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin", process.env.PATH ?? ""].filter(Boolean).join(":")
  };
  if (bypassProxy) {
    for (const key of [
      "http_proxy",
      "https_proxy",
      "all_proxy",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "ALL_PROXY",
      "socks_proxy",
      "SOCKS_PROXY"
    ]) {
      delete env[key];
    }
  }
  return env;
}
function formatHmsDisplay(sec) {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor(safe % 3600 / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function formatFfmpegTimestamp(sec) {
  const totalMs = Math.round(Math.max(0, sec) * 1e3);
  const h = Math.floor(totalMs / 36e5);
  const m = Math.floor(totalMs % 36e5 / 6e4);
  const s = Math.floor(totalMs % 6e4 / 1e3);
  const ms = totalMs % 1e3;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
function formatFileTimeTag(sec) {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor(safe % 3600 / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
}
function sanitizeMovieTitle(rawTitle) {
  const cleaned = rawTitle.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "Media";
}
function getUniqueBaseName(saveDir, rawBase) {
  let candidate = rawBase;
  let counter = 1;
  while (import_node_fs2.default.existsSync(import_node_path2.default.join(saveDir, `${candidate}_clean.png`)) || import_node_fs2.default.existsSync(import_node_path2.default.join(saveDir, `${candidate}_subbed.png`)) || import_node_fs2.default.existsSync(import_node_path2.default.join(saveDir, `${candidate}_layered.svg`)) || import_node_fs2.default.existsSync(import_node_path2.default.join(saveDir, `${candidate}.mkv`))) {
    candidate = `${rawBase} (${counter})`;
    counter += 1;
  }
  return candidate;
}
function statePaths(supportPath) {
  return {
    queueFile: import_node_path2.default.join(supportPath, "task_queue.json"),
    lockFile: import_node_path2.default.join(supportPath, "worker.lock"),
    activeFile: import_node_path2.default.join(supportPath, "active_task.json"),
    historyFile: import_node_path2.default.join(supportPath, "history.json"),
    clipInFile: import_node_path2.default.join(supportPath, "clip_in.json"),
    projectsDir: import_node_path2.default.join(supportPath, "projects"),
    binCacheDir: import_node_path2.default.join(supportPath, "bin-cache")
  };
}

// src/worker/state-store.ts
var import_node_fs3 = __toESM(require("node:fs"));
var import_node_path3 = __toESM(require("node:path"));
var import_node_crypto2 = require("node:crypto");
function alive2(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
function taskGroupAlive(pid) {
  if (alive2(pid)) return true;
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
function readJson(file, fallback) {
  try {
    return JSON.parse(import_node_fs3.default.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}
function writeJson(file, value) {
  import_node_fs3.default.mkdirSync(import_node_path3.default.dirname(file), { recursive: true, mode: 448 });
  const tmp = `${file}.${process.pid}.${(0, import_node_crypto2.randomUUID)()}.tmp`;
  try {
    import_node_fs3.default.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 384, flag: "wx" });
    import_node_fs3.default.renameSync(tmp, file);
  } finally {
    import_node_fs3.default.rmSync(tmp, { force: true });
  }
}
var held = /* @__PURE__ */ new Set();
var sleeper = new Int32Array(new SharedArrayBuffer(4));
function transaction(supportPath, callback) {
  const dir = import_node_path3.default.resolve(supportPath, "state-transactions");
  if (held.has(dir)) return callback();
  import_node_fs3.default.mkdirSync(dir, { recursive: true, mode: 448 });
  const key = `${process.pid}-${(0, import_node_crypto2.randomUUID)()}.json`;
  const mine = import_node_path3.default.join(dir, key);
  const participants = () => import_node_fs3.default.readdirSync(dir).filter((name) => /^\d+-[\da-f-]+\.json$/.test(name));
  const inspect = (name) => {
    if (!alive2(Number.parseInt(name, 10))) {
      import_node_fs3.default.rmSync(import_node_path3.default.join(dir, name), { force: true });
      return null;
    }
    return readJson(import_node_path3.default.join(dir, name), null);
  };
  const deadline = Date.now() + 15e3;
  try {
    writeJson(mine, { choosing: true, ticket: 0 });
    const ticket = 1 + participants().reduce((max, name) => Math.max(max, inspect(name)?.ticket ?? 0), 0);
    writeJson(mine, { choosing: false, ticket });
    for (const name of participants()) {
      if (name === key) continue;
      for (; ; ) {
        const other = inspect(name);
        if (!other || !other.choosing && (other.ticket > ticket || other.ticket === ticket && name > key)) break;
        if (Date.now() > deadline) throw new Error("Task state is busy. Try again later.");
        Atomics.wait(sleeper, 0, 0, 10);
      }
    }
    held.add(dir);
    try {
      return callback();
    } finally {
      held.delete(dir);
    }
  } finally {
    import_node_fs3.default.rmSync(mine, { force: true });
  }
}

// src/lib/queue.ts
var MAX_HISTORY_ITEMS = 40;
var readJsonSafe = readJson;
var writeJsonAtomic = writeJson;
function readQueue(supportPath) {
  return readJsonSafe(statePaths(supportPath).queueFile, []);
}
function saveQueue(supportPath, tasks) {
  transaction(supportPath, () => writeJsonAtomic(statePaths(supportPath).queueFile, tasks));
}
function enqueueTask(supportPath, task) {
  return transaction(supportPath, () => {
    const queue = readQueue(supportPath);
    if (!queue.some((item) => item.id === task.id) && !listActiveTasks(supportPath).some((item) => item.task.id === task.id))
      queue.push(task);
    saveQueue(supportPath, queue);
    return {
      shots: queue.filter((t) => t.type === "screenshot").length,
      clips: queue.filter((t) => t.type === "clip").length
    };
  });
}
var isProcessAlive = alive2;
function listActiveTasks(supportPath) {
  return transaction(supportPath, () => {
    const dir = import_node_path4.default.join(supportPath, "active-tasks");
    const states = import_node_fs4.default.existsSync(dir) ? import_node_fs4.default.readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => readJsonSafe(import_node_path4.default.join(dir, file), null)).filter((state) => !!state && taskGroupAlive(state.pid)) : [];
    const legacy = readJsonSafe(statePaths(supportPath).activeFile, null);
    if (legacy && isProcessAlive(legacy.pid) && !states.some((state) => state.task.id === legacy.task.id))
      states.push(legacy);
    return states.sort((a, b) => a.startedAt - b.startedAt || a.task.id.localeCompare(b.task.id));
  });
}
function readHistory(supportPath) {
  return readJsonSafe(statePaths(supportPath).historyFile, []).map(syncExportEntry).filter((entry) => !!entry);
}
function appendHistory(supportPath, entry) {
  transaction(supportPath, () => {
    const filtered = readHistory(supportPath).filter((item) => item.id !== entry.id);
    filtered.unshift(entry.status === "failed" ? entry : { ...entry, exportSignatures: exportSignatures(entry) });
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      filtered.filter((item, index) => item.status === "failed" || index < MAX_HISTORY_ITEMS)
    );
  });
}
function deleteHistoryEntry(supportPath, entryId) {
  transaction(
    supportPath,
    () => writeJsonAtomic(
      statePaths(supportPath).historyFile,
      readHistory(supportPath).filter((item) => item.id !== entryId)
    )
  );
}
function updateHistoryEntry(supportPath, entry) {
  transaction(supportPath, () => {
    const history = readHistory(supportPath);
    const index = history.findIndex((item) => item.id === entry.id);
    if (index < 0) {
      history.unshift({ ...entry, exportSignatures: exportSignatures(entry) });
    } else {
      history[index] = { ...history[index], ...entry, exportSignatures: exportSignatures(entry) };
    }
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      history.filter((item, i) => item.status === "failed" || i < MAX_HISTORY_ITEMS)
    );
  });
}

// src/lib/storage-maintenance.ts
async function clearTemporaryStorage(supportPath, expiredOnly = false) {
  const cache = new SegmentCache(supportPath);
  let freed = 0;
  if (expiredOnly) await cache.prune();
  else freed = await cache.clearUnused();
  const protectedIds = /* @__PURE__ */ new Set([
    ...listActiveTasks(supportPath).map((s) => s.task.id),
    ...readQueue(supportPath).map((t) => t.id)
  ]);
  const projects = import_node_path5.default.join(supportPath, "projects");
  if (import_node_fs5.default.existsSync(projects))
    for (const id of import_node_fs5.default.readdirSync(projects)) {
      if (protectedIds.has(id)) continue;
      const dir = import_node_path5.default.join(projects, id);
      if (!import_node_fs5.default.statSync(dir).isDirectory()) continue;
      for (const name of import_node_fs5.default.readdirSync(dir)) {
        if (/^(?:_preroll\.mkv|_disc-[\da-f-]+\.ts|_text_overlay_.*\.png(?:\.spec\.json)?|track_\d+\.sup|preview-\d+\.jpg)$/.test(
          name
        )) {
          const file = import_node_path5.default.join(dir, name);
          freed += import_node_fs5.default.statSync(file).size;
          import_node_fs5.default.rmSync(file, { force: true });
        }
      }
    }
  const modules = import_node_path5.default.join(supportPath, "bin-cache", "swift-module-cache");
  if (!listActiveTasks(supportPath).length && !readQueue(supportPath).length && import_node_fs5.default.existsSync(modules)) {
    const size = (dir) => import_node_fs5.default.readdirSync(dir, { withFileTypes: true }).reduce(
      (sum, e) => sum + (e.isDirectory() ? size(import_node_path5.default.join(dir, e.name)) : e.isFile() ? import_node_fs5.default.statSync(import_node_path5.default.join(dir, e.name)).size : 0),
      0
    );
    freed += size(modules);
    import_node_fs5.default.rmSync(modules, { recursive: true, force: true });
  }
  return freed;
}

// src/worker/worker-entry.ts
var import_node_path16 = __toESM(require("node:path"));
var import_node_child_process5 = require("node:child_process");

// src/worker/task-process.ts
var import_node_fs13 = __toESM(require("node:fs"));

// src/lib/disc-source.ts
var import_node_crypto3 = require("node:crypto");
var import_promises2 = __toESM(require("node:fs/promises"));
var import_node_path6 = __toESM(require("node:path"));
var import_node_fs6 = require("node:fs");
init_command_runner();
var MAX_SEGMENT_BYTES2 = 2048 * 1024 * 1024;
var DiscPlaylistCandidatesError = class extends Error {
  constructor(candidates) {
    super(
      "The disc has multiple different playlists. Up to 3 candidates are captured separately; with more than 3 the task stops to avoid downloading too many versions at once."
    );
    this.candidates = candidates;
    this.name = "DiscPlaylistCandidatesError";
    this.canAutoBatch = candidates.length > 0 && candidates.length <= 3;
  }
  canAutoBatch;
};
function validPid(pid) {
  return Number.isInteger(pid) && pid > 0 && pid < 8191;
}
function stopped(error) {
  return error instanceof Error && error.message === "Task stopped manually";
}
async function prepareDiscSource(task, inputTarget, projectDir, onLocated, preview = false) {
  const { config, probe } = task;
  const { playlist: playlistId, durationSec: titleDurationSec } = probe;
  if (!Number.isFinite(probe.positionSec) || probe.positionSec < 0 || probe.positionSec > 864e5) {
    throw new Error("Blu-ray target time must be finite, nonnegative, and title-relative.");
  }
  if (playlistId !== void 0 && (!Number.isInteger(playlistId) || playlistId < 0 || playlistId > 99999)) {
    throw new Error("Blu-ray playlistId must be an integer from 0 to 99999.");
  }
  if (titleDurationSec !== void 0 && (!Number.isFinite(titleDurationSec) || titleDurationSec <= 0 || titleDurationSec > 864e5)) {
    throw new Error("Blu-ray titleDurationSec must be a positive finite duration.");
  }
  if (!inputTarget || inputTarget.includes("\0")) throw new Error("Blu-ray source path is empty or invalid.");
  if (inputTarget.includes("://")) {
    let url;
    try {
      url = new URL(inputTarget);
    } catch {
      throw new Error("Invalid Blu-ray proxy URL.");
    }
    if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.hash) {
      throw new Error("Blu-ray HTTP input requires a numeric-loopback bounded range proxy URL.");
    }
  }
  const source = import_node_path6.default.join(config.assetsPath, "disc-reader.c");
  let sourceBytes;
  try {
    sourceBytes = await import_promises2.default.readFile(source);
  } catch {
    throw new Error("Blu-ray native helper source is missing from extension assets.");
  }
  const cacheDir = import_node_path6.default.join(config.supportPath, "bin-cache");
  await import_promises2.default.mkdir(cacheDir, { recursive: true });
  const digest = (0, import_node_crypto3.createHash)("sha256").update(sourceBytes).update(process.arch).digest("hex").slice(0, 20);
  const binary = import_node_path6.default.join(cacheDir, `disc-reader-${digest}`);
  const env = buildExecutionEnv(true);
  const prefix = (0, import_node_fs6.existsSync)("/opt/homebrew/include/libbluray/bluray.h") ? "/opt/homebrew" : "/usr/local";
  try {
    await import_promises2.default.access(binary, import_promises2.default.constants.X_OK);
  } catch {
    const temporary = `${binary}-${(0, import_node_crypto3.randomUUID)()}`;
    try {
      let flags = [];
      try {
        const result = await runCommand(`${prefix}/bin/pkg-config`, ["--cflags", "--libs", "libbluray", "libcurl"], {
          env,
          maxBuffer: 64 * 1024
        });
        const tokens = result.stdout.trim().split(/\s+/).filter(Boolean);
        if (tokens.every((flag) => /^[-A-Za-z0-9_./,+=:]+$/.test(flag))) flags = tokens;
      } catch (error) {
        if (stopped(error)) throw error;
      }
      await runCommand(
        "/usr/bin/clang",
        [
          "-std=c11",
          "-O2",
          "-Wall",
          "-Wextra",
          "-Werror",
          `-I${prefix}/include`,
          `-L${prefix}/lib`,
          `-Wl,-rpath,${prefix}/lib`,
          source,
          "-o",
          temporary,
          ...flags,
          "-lbluray",
          "-lcurl"
        ],
        { env, maxBuffer: 128 * 1024 }
      );
      await import_promises2.default.rename(temporary, binary);
    } catch (error) {
      if (stopped(error)) throw error;
      throw new Error(
        "Couldn't build the disc reader. It needs the Xcode Command Line Tools plus libbluray, libudfread, and curl from Homebrew. See the README for setup."
      );
    } finally {
      await import_promises2.default.rm(temporary, { force: true });
    }
  }
  await import_promises2.default.mkdir(projectDir, { recursive: true });
  const mediaPath = import_node_path6.default.join(projectDir, `_disc-${(0, import_node_crypto3.randomUUID)()}.ts`);
  const args2 = [inputTarget, mediaPath, String(probe.positionSec)];
  if (preview) args2.push("--preview", "1");
  if (playlistId !== void 0) args2.push("--playlist", String(playlistId));
  if (titleDurationSec !== void 0) args2.push("--duration", String(titleDurationSec));
  try {
    let stdout;
    try {
      const result = await runCommand(binary, args2, {
        env,
        maxBuffer: 1024 * 1024,
        onStderrLine: (line) => {
          if (line === "disc-stage: reading target segment") onLocated?.();
        }
      });
      stdout = result.stdout;
      await import_promises2.default.writeFile(
        import_node_path6.default.join(projectDir, "disc-stages.log"),
        result.stderr.split("\n").filter((line) => line.startsWith("disc-stage:")).join("\n")
      );
    } catch (error) {
      if (stopped(error)) throw error;
      const stderr = error?.stderr;
      if (typeof stderr === "string")
        await import_promises2.default.writeFile(
          import_node_path6.default.join(projectDir, "disc-stages.log"),
          stderr.split("\n").filter((line) => line.startsWith("disc-stage:")).join("\n")
        );
      const detail = typeof stderr === "string" ? stderr.split("\n").find((line) => line.startsWith("disc-reader: ")) : void 0;
      if (detail?.includes("ambiguous playlists")) {
        const candidates = typeof stderr === "string" ? stderr.split("\n").filter((line) => line.startsWith("disc-candidate: ")).map((line) => JSON.parse(line.slice("disc-candidate: ".length))) : [];
        await import_promises2.default.writeFile(import_node_path6.default.join(projectDir, "playlists.json"), JSON.stringify(candidates));
        throw new DiscPlaylistCandidatesError(candidates);
      }
      if (detail?.includes("crosses a playlist clip boundary"))
        throw new Error(
          "The capture point is too close to a Blu-ray clip boundary, and joining timelines across clips isn't supported yet. Reading stopped."
        );
      if (detail?.includes("no matching playlist"))
        throw new Error(
          "No disc playlist matches the duration reported by the player. Specify one explicitly with playlist=<number>."
        );
      throw new Error(detail ?? "The disc reader couldn't run. Check that libbluray and libcurl are installed.");
    }
    const metadata = JSON.parse(stdout);
    const stat = await import_promises2.default.stat(mediaPath);
    if (metadata.version !== 1 || !validPid(metadata.videoPid) || !Array.isArray(metadata.pgStreams) || metadata.pgStreams.some(
      (stream) => !stream || !validPid(stream.pid) || typeof stream.language !== "string" || !/^[a-z]{3}$/.test(stream.language)
    ) || !Number.isSafeInteger(metadata.sourceTargetPts) || !Number.isFinite(metadata.targetSec) || !Number.isFinite(metadata.coarseSec) || metadata.coarseSec < 0 || metadata.coarseSec > metadata.targetSec || Math.abs(metadata.targetSec - metadata.sourceTargetPts / 9e4) > 1e-6 || !Number.isSafeInteger(metadata.bytes) || metadata.bytes <= 0 || metadata.bytes > MAX_SEGMENT_BYTES2 || metadata.bytes % 188 !== 0 || stat.size !== metadata.bytes || !stat.isFile()) {
      throw new Error("Blu-ray helper returned an invalid segment or timestamp mapping.");
    }
    return {
      mediaPath,
      targetSec: metadata.targetSec,
      coarseSec: metadata.coarseSec,
      videoPid: metadata.videoPid,
      subtitleLanguages: metadata.pgStreams
    };
  } catch (error) {
    await import_promises2.default.rm(mediaPath, { force: true });
    throw error;
  }
}

// src/worker/task-process.ts
var import_node_crypto4 = require("node:crypto");
var import_node_path14 = __toESM(require("node:path"));
init_command_runner();

// src/lib/task-errors.ts
function describeTaskError(error, task) {
  const err = error;
  if (err.code === "ENOENT")
    return "FFmpeg or FFprobe not found. Install FFmpeg or set the correct path in the extension preferences.";
  if (err.code === "EACCES" || err.code === "EPERM")
    return "Permission denied reading the video, running a tool, or writing to the save folder. Check the path permissions.";
  if (err.killed)
    return "Processing timed out. Check the direct video link, network speed, and proxy settings, then try again.";
  let detail = String(err.stderr || err.message || "Unknown error");
  for (const secret of [task.config.jellyfinApiKey, task.probe.mediaTarget]) {
    if (secret) detail = detail.split(secret).join("[redacted]");
  }
  detail = detail.replace(/https?:\/\/[^\s"'<>]+/gi, "[media URL redacted]").replace(/(?:api_key|token|authorization)\s*[=:]\s*[^\s,;]+/gi, "credentials=[redacted]");
  if (/401|403|Unauthorized|Forbidden/i.test(detail))
    return "The server denied access to the video (401/403). Seeing the playback session doesn't mean the token can read the original file; check your token's permissions.";
  return detail.slice(-1800);
}

// src/lib/macos-native.ts
var import_node_child_process3 = require("node:child_process");
var import_node_fs7 = __toESM(require("node:fs"));
var import_node_path7 = __toESM(require("node:path"));
init_command_runner();
var HELPER_VERSION = "v2";
var SWIFT_HELPER_SOURCE = `
import AppKit
import Foundation
import Vision

struct TextOverlayLayerSpec: Decodable {
    let text: String
    let fontFamily: String
    let fontSize: Double
    let fillHex: String
    let strokeHex: String
    let yOffset: Double
    let alignTop: Bool
}

struct RenderTextPayload: Decodable {
    let width: Int
    let height: Int
    let layers: [TextOverlayLayerSpec]
}

func colorFromHex(_ hex: String, fallback: NSColor) -> NSColor {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard cleaned.count == 6, let val = UInt64(cleaned, radix: 16) else {
        return fallback
    }
    let r = CGFloat((val >> 16) & 0xFF) / 255.0
    let g = CGFloat((val >> 8) & 0xFF) / 255.0
    let b = CGFloat(val & 0xFF) / 255.0
    return NSColor(srgbRed: r, green: g, blue: b, alpha: 1.0)
}

func runOCR(imagePath: String) throws {
    let url = URL(fileURLWithPath: imagePath)
    let handler = VNImageRequestHandler(url: url, options: [:])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US", "ja-JP"]

    try handler.perform([request])
    let observations = request.results ?? []
    // Sort top-to-bottom (Vision y=0 is bottom, y=1 is top)
    let sorted = observations.sorted { $0.boundingBox.midY > $1.boundingBox.midY }
    let lines = sorted.compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    let result = ["lines": lines, "text": lines.joined(separator: "\\n")] as [String: Any]
    let data = try JSONSerialization.data(withJSONObject: result, options: [])
    FileHandle.standardOutput.write(data)
}

func runRenderText(specPath: String, outPath: String) throws {
    let specData = try Data(contentsOf: URL(fileURLWithPath: specPath))
    let payload = try JSONDecoder().decode(RenderTextPayload.self, from: specData)
    let w = max(16, payload.width)
    let h = max(16, payload.height)

    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: w,
        pixelsHigh: h,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        exit(2)
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.lineSpacing = 6

    for layer in payload.layers {
        let trimmed = layer.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { continue }

        let fontSize = CGFloat(layer.fontSize)
        let font = NSFont(name: layer.fontFamily, size: fontSize)
            ?? NSFont.systemFont(ofSize: fontSize, weight: .semibold)
        let fillColor = colorFromHex(layer.fillHex, fallback: .white)
        let strokeColor = colorFromHex(layer.strokeHex, fallback: .black)

        let shadow = NSShadow()
        shadow.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.82)
        shadow.shadowBlurRadius = max(4.0, fontSize * 0.14)
        shadow.shadowOffset = NSSize(width: 0, height: -max(2.0, fontSize * 0.05))

        let strokeAttrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: paragraph,
            .strokeColor: strokeColor,
            .strokeWidth: max(4.0, fontSize * 0.14),
            .shadow: shadow
        ]
        let fillAttrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: paragraph,
            .foregroundColor: fillColor
        ]

        let maxBoxWidth = CGFloat(w) * 0.86
        let strokeStr = NSAttributedString(string: trimmed, attributes: strokeAttrs)
        let fillStr = NSAttributedString(string: trimmed, attributes: fillAttrs)
        let bounds = fillStr.boundingRect(
            with: NSSize(width: maxBoxWidth, height: CGFloat(h) * 0.5),
            options: [.usesLineFragmentOrigin, .usesFontLeading]
        )

        let margin = CGFloat(h) * 0.065
        // Note: AppKit flipped=false -> y=0 is bottom!
        let baseBottomY: CGFloat
        if layer.alignTop {
            baseBottomY = CGFloat(h) - margin - ceil(bounds.height) - CGFloat(layer.yOffset)
        } else {
            baseBottomY = margin - CGFloat(layer.yOffset)
        }

        let drawRect = NSRect(
            x: (CGFloat(w) - maxBoxWidth) / 2.0,
            y: baseBottomY,
            width: maxBoxWidth,
            height: ceil(bounds.height) + fontSize * 0.35
        )
        strokeStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
        fillStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    }

    NSGraphicsContext.restoreGraphicsState()
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        exit(3)
    }
    try pngData.write(to: URL(fileURLWithPath: outPath))
}

func runCopyImage(imagePath: String) throws {
    let url = URL(fileURLWithPath: imagePath)
    let data = try Data(contentsOf: url)
    let pb = NSPasteboard.general
    pb.clearContents()
    pb.setData(data, forType: .png)
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    exit(1)
}

do {
    switch args[1] {
    case "ocr":
        try runOCR(imagePath: args[2])
    case "render-text":
        guard args.count >= 4 else { exit(1) }
        try runRenderText(specPath: args[2], outPath: args[3])
    case "copy-image":
        try runCopyImage(imagePath: args[2])
    default:
        exit(1)
    }
} catch {
    fputs("\\(error)\\n", stderr)
    exit(1)
}
`;
async function ensureNativeHelper(supportPath) {
  const { binCacheDir } = statePaths(supportPath);
  import_node_fs7.default.mkdirSync(binCacheDir, { recursive: true });
  const binPath = import_node_path7.default.join(binCacheDir, `framecraft-macos-helper-${HELPER_VERSION}`);
  if (import_node_fs7.default.existsSync(binPath)) {
    return binPath;
  }
  const srcPath = import_node_path7.default.join(binCacheDir, `framecraft-macos-helper-${HELPER_VERSION}.swift`);
  const tmpModuleCache = import_node_path7.default.join(binCacheDir, "swift-module-cache");
  import_node_fs7.default.mkdirSync(tmpModuleCache, { recursive: true });
  import_node_fs7.default.writeFileSync(srcPath, SWIFT_HELPER_SOURCE, "utf-8");
  try {
    await runCommand("/usr/bin/swiftc", ["-O", "-module-cache-path", tmpModuleCache, srcPath, "-o", binPath], {
      env: { ...process.env, TMPDIR: binCacheDir },
      timeout: 45e3
    });
    return import_node_fs7.default.existsSync(binPath) ? binPath : null;
  } catch {
    return null;
  }
}
async function renderTransparentTextOverlayPng(supportPath, width, height, layers, outPngPath) {
  const helper = await ensureNativeHelper(supportPath);
  if (!helper) return false;
  const specPath = `${outPngPath}.spec.json`;
  import_node_fs7.default.writeFileSync(specPath, JSON.stringify({ width, height, layers }), "utf-8");
  try {
    await runCommand(helper, ["render-text", specPath, outPngPath], { timeout: 1e4 });
    return import_node_fs7.default.existsSync(outPngPath);
  } catch {
    return false;
  } finally {
    import_node_fs7.default.rmSync(specPath, { force: true });
  }
}
async function copyPngToClipboard(supportPath, pngPath) {
  if (!import_node_fs7.default.existsSync(pngPath)) return;
  const helper = await ensureNativeHelper(supportPath);
  if (helper) {
    try {
      await runCommand(helper, ["copy-image", pngPath], { timeout: 5e3 });
      return;
    } catch {
    }
  }
  const escaped = pngPath.replace(/"/g, '\\"');
  await runCommand(
    "/usr/bin/osascript",
    ["-e", `set the clipboard to (read (POSIX file "${escaped}") as \xABclass PNGf\xBB)`],
    { timeout: 5e3 }
  ).catch(() => void 0);
}
function postMacNotification(title, message) {
  const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeMsg = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " \xB7 ");
  try {
    const child = (0, import_node_child_process3.spawn)("/usr/bin/osascript", ["-e", `display notification "${safeMsg}" with title "${safeTitle}"`], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
  } catch {
  }
}

// src/lib/media-engine.ts
var import_node_fs12 = __toESM(require("node:fs"));
var import_node_path13 = __toESM(require("node:path"));

// src/lib/probe.ts
init_command_runner();
var BITMAP_SUB_CODECS = /* @__PURE__ */ new Set([
  "hdmv_pgs_subtitle",
  "pgssub",
  "pgs",
  "dvd_subtitle",
  "dvdsub",
  "dvb_subtitle",
  "dvbsub",
  "xsub"
]);
var LANGUAGE_NAMES = {
  zho: "Chinese",
  chi: "Chinese",
  zh: "Chinese",
  cmn: "Mandarin",
  yue: "Cantonese",
  eng: "English",
  en: "English",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  fra: "French",
  fre: "French",
  fr: "French",
  deu: "German",
  ger: "German",
  de: "German",
  spa: "Spanish",
  es: "Spanish",
  ita: "Italian",
  it: "Italian",
  rus: "Russian",
  ru: "Russian",
  por: "Portuguese",
  pt: "Portuguese",
  tha: "Thai",
  th: "Thai",
  vie: "Vietnamese",
  vi: "Vietnamese",
  ind: "Indonesian",
  nld: "Dutch",
  dut: "Dutch",
  nl: "Dutch",
  swe: "Swedish",
  sv: "Swedish",
  dan: "Danish",
  da: "Danish",
  nor: "Norwegian",
  no: "Norwegian",
  fin: "Finnish",
  fi: "Finnish",
  pol: "Polish",
  pl: "Polish",
  tur: "Turkish",
  tr: "Turkish",
  ara: "Arabic",
  ar: "Arabic",
  heb: "Hebrew",
  he: "Hebrew",
  hin: "Hindi",
  hi: "Hindi",
  ces: "Czech",
  cze: "Czech",
  cs: "Czech",
  hun: "Hungarian",
  hu: "Hungarian",
  ell: "Greek",
  gre: "Greek",
  el: "Greek",
  ukr: "Ukrainian",
  uk: "Ukrainian",
  msa: "Malay",
  may: "Malay"
};
function subtitleLanguageLabel(language) {
  const key = (language || "").toLowerCase();
  return LANGUAGE_NAMES[key] ?? (key === "und" || !key ? "Unknown language" : key.toUpperCase());
}
function classifySubtitleStream(index, subOrdinal, codecRaw, langRaw, titleRaw) {
  const codec = (codecRaw || "unknown").toLowerCase();
  const language = (langRaw || "und").toLowerCase();
  const title = titleRaw || `Track ${index + 1} (${subtitleLanguageLabel(language)})`;
  const titleLower = title.toLowerCase();
  const isBitmap = BITMAP_SUB_CODECS.has(codec);
  const isChinese = ["zho", "chi", "zh", "chs", "cht", "cn", "tw", "hk"].some(
    (code) => language === code || language.startsWith(`${code}-`)
  ) || title.includes("\u4E2D") || title.includes("\u7B80") || title.includes("\u7E41") || title.includes("\u56FD") || titleLower.includes("chinese") || titleLower.includes("chs") || titleLower.includes("cht");
  const isEnglish = language === "eng" || language === "en" || language.startsWith("en-") || title.includes("\u82F1") || titleLower.includes("english");
  return {
    index,
    subOrdinal,
    codec,
    language,
    title,
    isBitmap,
    isChinese,
    isEnglish
  };
}
async function inspectContainerMetadata(ffprobePath, mediaPathOrUrl, bypassProxy, timeoutMs = 2e4) {
  const env = buildExecutionEnv(bypassProxy);
  const isRemote = /^https?:\/\//i.test(mediaPathOrUrl);
  const args2 = [
    "-v",
    "error",
    ...isRemote ? ["-reconnect", "1", "-reconnect_streamed", "1"] : [],
    "-probesize",
    "10M",
    "-analyzeduration",
    "10M",
    "-show_entries",
    "stream=id,index,codec_type,codec_name,width,height,pix_fmt,color_space,color_transfer,color_primaries:stream_tags=language,title",
    "-of",
    "json",
    mediaPathOrUrl
  ];
  const { stdout } = await runCommand(ffprobePath, args2, {
    env,
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024
  });
  const parsed = JSON.parse(stdout);
  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const colorTransfer = video?.color_transfer;
  const colorPrimaries = video?.color_primaries;
  const isPq = colorTransfer === "smpte2084";
  const isHdr = isPq || colorTransfer === "arib-std-b67" || colorTransfer === void 0 && colorPrimaries === "bt2020";
  const colorInfo = {
    width: video?.width || 1920,
    height: video?.height || 1080,
    pixFmt: video?.pix_fmt || "yuv420p",
    colorSpace: video?.color_space,
    colorTransfer,
    colorPrimaries,
    isHdr,
    isPq
  };
  const subtitles = [];
  let subOrd = 0;
  for (const st of streams) {
    if (st.codec_type === "subtitle") {
      const lang = st.tags?.language ?? st.tags?.LANGUAGE ?? "und";
      const tagged = st.tags?.title ?? st.tags?.TITLE;
      const title = tagged || "";
      const subtitle = classifySubtitleStream(st.index, subOrd, st.codec_name ?? "unknown", lang, title);
      if (st.id) subtitle.pid = Number(st.id);
      subtitles.push(subtitle);
      subOrd += 1;
    }
  }
  return { colorInfo, subtitles };
}

// src/lib/subtitles.ts
var import_node_fs8 = __toESM(require("node:fs"));
var import_node_path8 = __toESM(require("node:path"));
function parseSrtTimestamp(raw) {
  const m = raw.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const ms = Number(m[4].padEnd(3, "0"));
  return h * 3600 + min * 60 + sec + ms / 1e3;
}
function cleanSubtitleMarkup(raw) {
  return raw.replace(/\\N/g, "\n").replace(/\\n/g, "\n").replace(/\\h/g, " ").replace(/\{[^}]*\}/g, "").replace(/<\/?[a-zA-Z][^>]*>/g, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n");
}
function parseSrtOrVttContent(rawContent) {
  const normalized = rawContent.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const arrowIdx = lines.findIndex((l) => l.includes("-->"));
    if (arrowIdx === -1) continue;
    const timeParts = lines[arrowIdx].split("-->");
    if (timeParts.length < 2) continue;
    const startSec = parseSrtTimestamp(timeParts[0]);
    const endToken = timeParts[1].trim().split(/\s+/)[0];
    const endSec = parseSrtTimestamp(endToken);
    if (startSec === null || endSec === null) continue;
    const text = cleanSubtitleMarkup(lines.slice(arrowIdx + 1).join("\n"));
    if (text) {
      cues.push({ startSec, endSec, text });
    }
  }
  return cues;
}
function parseAssContent(rawContent) {
  const lines = rawContent.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues = [];
  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;
    const rest = line.slice("Dialogue:".length).trim();
    const parts = rest.split(",");
    if (parts.length < 10) continue;
    const startSec = parseSrtTimestamp(parts[1]);
    const endSec = parseSrtTimestamp(parts[2]);
    if (startSec === null || endSec === null) continue;
    const rawText = parts.slice(9).join(",");
    const text = cleanSubtitleMarkup(rawText);
    if (text) {
      cues.push({ startSec, endSec, text });
    }
  }
  return cues;
}
function findActiveSubtitleText(rawSubText, targetSec) {
  const cues = rawSubText.includes("Dialogue:") ? parseAssContent(rawSubText) : parseSrtOrVttContent(rawSubText);
  if (cues.length === 0) return "";
  const hits = cues.filter((c) => targetSec >= c.startSec - 0.08 && targetSec <= c.endSec + 0.08).map((c) => c.text);
  return Array.from(new Set(hits)).join("\n");
}
function applyInitialLayerSelection(layers, mode, frameHeight) {
  for (const l of layers) {
    l.visible = false;
    l.yOffset = 0;
  }
  if (mode === "clean" || layers.length === 0) {
    return;
  }
  const isChinese = (l) => l.isChinese || /^(zh|zho|chi|cmn)(?:[-_]|$)/i.test(l.language) || /中文|简体|繁体|簡體|繁體|Chinese/i.test(l.title);
  const isEnglish = (l) => l.isEnglish || /^(en|eng)(?:[-_]|$)/i.test(l.language) || /英文|英语|英語|English/i.test(l.title);
  const isExplicitBilingual = (l) => /中英|英中|Chinese\s*(?:[+&/-]|and)\s*English|English\s*(?:[+&/-]|and)\s*Chinese/i.test(l.title) || isChinese(l) && /英文|英语|英語|English/i.test(l.title);
  const richness = (l) => l.kind === "bitmap" ? l.bitmapBytes ?? 0 : l.text?.length ?? 0;
  const pool = layers.filter((l) => l.hasActiveContent);
  const chiCandidates = pool.filter((l) => isChinese(l) || isExplicitBilingual(l)).sort((a, b) => Number(isExplicitBilingual(b)) - Number(isExplicitBilingual(a)) || richness(b) - richness(a));
  const engCandidates = pool.filter(isEnglish);
  const unknownCandidates = pool.filter((l) => !isChinese(l) && !isEnglish(l)).sort((a, b) => richness(b) - richness(a));
  const primary = chiCandidates[0] ?? engCandidates[0] ?? unknownCandidates[0];
  if (primary) {
    primary.visible = true;
  }
  if (mode === "bilingual") {
    if (primary && isExplicitBilingual(primary)) return;
    const secondary = engCandidates.find((l) => l.id !== primary?.id);
    if (secondary) {
      secondary.visible = true;
      if (primary && primary.hasActiveContent && secondary.hasActiveContent) {
        secondary.yOffset = -Math.round(frameHeight * 0.1);
      }
    }
  }
}
function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function buildLayeredSvg(manifest) {
  const { width, height } = manifest.colorInfo;
  const barPad = manifest.cinemaBar ? Math.round(height * 0.12) : 0;
  const totalHeight = height + barPad * 2;
  const videoY = barPad;
  const cleanBuf = import_node_fs8.default.readFileSync(manifest.cleanPngPath);
  const cleanB64 = cleanBuf.toString("base64");
  const svgLayers = [];
  for (const layer of manifest.layers) {
    const opacity = layer.visible ? "1" : "0";
    const safeId = escapeXml(layer.id);
    const comment = `  <!-- Track [${layer.index}] ${escapeXml(layer.title)} (${layer.codec.toUpperCase()}) -->`;
    if (layer.kind === "bitmap" && layer.bitmapFilename) {
      const bmpPath = import_node_path8.default.join(manifest.projectDir, layer.bitmapFilename);
      if (!import_node_fs8.default.existsSync(bmpPath)) continue;
      const b64 = import_node_fs8.default.readFileSync(bmpPath).toString("base64");
      const baseImgY = manifest.alignTop ? -Math.round(height * 0.72) : 0;
      const finalY = videoY + baseImgY + layer.yOffset;
      svgLayers.push(
        [
          comment,
          `  <g id="${safeId}" data-track-index="${layer.index}" data-kind="bitmap" data-lang="${escapeXml(layer.language)}" opacity="${opacity}" transform="translate(0, ${finalY})">`,
          `    <image href="data:image/png;base64,${b64}" width="${width}" height="${height}" x="0" y="0"/>`,
          `  </g>`
        ].join("\n")
      );
    } else if (layer.kind === "text") {
      const fontSize = layer.fontSize ?? Math.max(28, Math.round(height * 0.044));
      const fontFamily = escapeXml(layer.fontFamily || "PingFang SC, Hiragino Sans GB, SF Pro Display, sans-serif");
      const fill = escapeXml(layer.fillColor || "#FFFFFF");
      const stroke = escapeXml(layer.strokeColor || "#000000");
      const strokeWidth = Math.max(4, Math.round(fontSize * 0.15));
      const lines = (layer.text ?? "").split(/\r?\n/).filter((l) => l.trim().length > 0);
      const lineStep = Math.round(fontSize * 1.32);
      const margin = Math.round(height * 0.075);
      const baseAnchorY = manifest.alignTop ? videoY + margin + fontSize + layer.yOffset : videoY + height - margin - Math.max(0, lines.length - 1) * lineStep + layer.yOffset;
      const centerX = Math.round(width / 2);
      const tspans = lines.length > 0 ? lines.map((line, idx) => {
        const dy = idx === 0 ? 0 : lineStep;
        return `      <tspan x="${centerX}" dy="${dy}">${escapeXml(line)}</tspan>`;
      }).join("\n") : `      <tspan x="${centerX}" dy="0"></tspan>`;
      svgLayers.push(
        [
          comment,
          `  <g id="${safeId}" data-track-index="${layer.index}" data-kind="text" data-lang="${escapeXml(layer.language)}" opacity="${opacity}">`,
          `    <text x="${centerX}" y="${baseAnchorY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke fill" filter="url(#framecraft-sub-shadow)">`,
          tspans,
          `    </text>`,
          `  </g>`
        ].join("\n")
      );
    }
  }
  return [
    `<svg width="100%" height="100%" viewBox="0 0 ${width} ${totalHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`,
    `  <defs>`,
    `    <filter id="framecraft-sub-shadow" x="-10%" y="-10%" width="120%" height="130%">`,
    `      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.82"/>`,
    `    </filter>`,
    `  </defs>`,
    `  <!-- Cinema #000000 baseplate prevents macOS QuickLook/Preview white-border artifacts -->`,
    `  <rect id="Layer-Baseplate" width="${width}" height="${totalHeight}" fill="#000000"/>`,
    `  <!-- 100% Source-Resolution Clean Frame -->`,
    `  <g id="Layer-0-CleanBackground" opacity="1">`,
    `    <image href="data:image/png;base64,${cleanB64}" width="${width}" height="${height}" x="0" y="${videoY}"/>`,
    `  </g>`,
    ...svgLayers,
    `</svg>`,
    ""
  ].join("\n");
}

// src/lib/media-engine.ts
init_command_runner();

// src/lib/media-response.ts
var import_node_http = __toESM(require("node:http"));
var import_node_https = __toESM(require("node:https"));
async function inspectMediaResponse(target, redirects = 0) {
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The video URL isn't an HTTP/HTTPS URL.");
  await new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? import_node_https.default : import_node_http.default).get(
      url,
      {
        headers: { Range: "bytes=0-511", "Accept-Encoding": "identity" }
      },
      (response) => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          response.destroy();
          if (redirects >= 5) {
            reject(new Error("The video URL redirected too many times."));
            return;
          }
          inspectMediaResponse(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject);
          return;
        }
        if (status !== 200 && status !== 206) {
          response.destroy();
          reject(new Error(`The video server returned HTTP ${status}; no readable media was received.`));
          return;
        }
        const type = String(response.headers["content-type"] || "").split(";")[0].toLowerCase();
        let prefix = Buffer.alloc(0);
        const finish = () => {
          const sample = prefix.toString("utf8").trimStart();
          response.destroy();
          if (/html|json|xml/.test(type) || /^(?:<!doctype html|<html|<\?xml|\{\s*"(?:error|message|code)")/i.test(sample)) {
            reject(
              new Error(
                `The video URL returned a web page or API text (${type || "unknown type"}) instead of the original video. In Jellyfin/Emby, check that the item supports direct play, that its media source is valid, and your reverse proxy setup.`
              )
            );
          } else if (!prefix.length) reject(new Error("The video server returned an empty response."));
          else if (/^https?:\/\//i.test(sample) || /^#EXTM3U/i.test(sample)) {
            reject(
              new Error(
                "The server returned a link or playlist text instead of a direct media file. It can't be read as MKV/MP4; the actual media source needs to be resolved."
              )
            );
          } else if (prefix.subarray(0, 2).toString("ascii") === "PK") {
            reject(new Error("The server returned a ZIP archive, which can't be read as a single video file."));
          } else resolve();
        };
        response.on("data", (chunk) => {
          prefix = Buffer.concat([prefix, chunk.subarray(0, 512 - prefix.length)]);
          if (prefix.length >= 512) finish();
        });
        response.on("end", finish);
        response.on("error", reject);
      }
    );
    const timer = setTimeout(
      () => request.destroy(
        new Error("Timed out after 15 seconds waiting for the video response; no file header was received.")
      ),
      15e3
    );
    request.once("close", () => clearTimeout(timer));
    request.once(
      "error",
      (error) => reject(
        new Error(
          error.code === "ENOTFOUND" ? "Couldn't resolve the video server's hostname." : "Couldn't read the video response: network connection or TLS certificate error."
        )
      )
    );
  });
}

// src/lib/range-source.ts
var import_node_http2 = __toESM(require("node:http"));
var import_node_https2 = __toESM(require("node:https"));

// src/lib/media-budget.ts
var GIB = 1024 * 1024 * 1024;
var MIB = 1024 * 1024;
var MAX_CLIP_DURATION_SECONDS = 20 * 60;
function computeMediaBudget(probe, learnedTotalBytes) {
  const knownBytes = Math.max(probe?.sizeBytes ?? 0, learnedTotalBytes ?? 0);
  const estimatedBytes = knownBytes > 0 ? knownBytes : probe?.bitrateBps && probe?.durationSec ? Math.round(probe.bitrateBps / 8 * probe.durationSec) : 0;
  const sizeGib = estimatedBytes / GIB;
  if (sizeGib >= 80) {
    const scale = Math.min(2, Math.max(1, sizeGib / 120));
    return {
      locateTimeoutMs: Math.round(36e4 * scale),
      socketIdleTimeoutMs: 24e4,
      maxRangeRequests: 6144,
      maxRangeBytes: 6 * GIB,
      maxSegmentBytes: Math.round(2560 * MIB),
      probeTimeoutMs: 12e4,
      prerollTimeoutMs: Math.round(48e4 * scale),
      frameDecodeTimeoutMs: 18e4,
      subtitleExtractTimeoutMs: 18e4
    };
  }
  if (sizeGib >= 20) {
    return {
      locateTimeoutMs: 24e4,
      socketIdleTimeoutMs: 15e4,
      maxRangeRequests: 3072,
      maxRangeBytes: 3 * GIB,
      maxSegmentBytes: 1536 * MIB,
      probeTimeoutMs: 75e3,
      prerollTimeoutMs: 3e5,
      frameDecodeTimeoutMs: 12e4,
      subtitleExtractTimeoutMs: 12e4
    };
  }
  const remoteUnknown = Boolean(probe?.isRemote && estimatedBytes === 0);
  return {
    locateTimeoutMs: remoteUnknown ? 24e4 : 12e4,
    socketIdleTimeoutMs: remoteUnknown ? 15e4 : 9e4,
    maxRangeRequests: remoteUnknown ? 3072 : 1024,
    maxRangeBytes: remoteUnknown ? 4 * GIB : 1536 * MIB,
    maxSegmentBytes: remoteUnknown ? 2048 * MIB : 768 * MIB,
    probeTimeoutMs: remoteUnknown ? 9e4 : 45e3,
    prerollTimeoutMs: remoteUnknown ? 36e4 : 15e4,
    frameDecodeTimeoutMs: remoteUnknown ? 15e4 : 9e4,
    subtitleExtractTimeoutMs: 12e4
  };
}

// src/lib/range-source.ts
var PROBE_WINDOW = 8 * 1024 * 1024;
var STREAM_WINDOW = 32 * 1024 * 1024;
async function openRangeSource(target, initialProbe) {
  const stats = {
    bytes: 0,
    requests: 0,
    totalBytes: initialProbe?.sizeBytes,
    cachedBytes: 0,
    ranges: [],
    uniqueRanges: 0
  };
  const seen = /* @__PURE__ */ new Set();
  const started = Date.now();
  const httpAgent = new import_node_http2.default.Agent({ keepAlive: true, maxSockets: 8 });
  const httpsAgent = new import_node_https2.default.Agent({ keepAlive: true, maxSockets: 8 });
  let budget = computeMediaBudget(initialProbe ?? { isRemote: true });
  let maxRequests = budget.maxRangeRequests;
  let maxBytes = budget.maxRangeBytes;
  let locateTimeoutMs = budget.locateTimeoutMs;
  let socketIdleMs = budget.socketIdleTimeoutMs;
  let lastServedEnd = -1;
  let failure;
  let located = false;
  let locateTimer;
  const clients = /* @__PURE__ */ new Set();
  const replies = /* @__PURE__ */ new Set();
  const fail = (reason) => {
    failure ||= reason;
    for (const req of clients) req.destroy();
    for (const res of replies) res.destroy();
  };
  const resetLocateTimer = (timeoutMs) => {
    if (located) return;
    if (locateTimer) clearTimeout(locateTimer);
    const remaining = Math.max(15e3, timeoutMs - (Date.now() - started));
    locateTimer = setTimeout(() => {
      if (!located) {
        fail(
          `Seeking took longer than ${Math.round(timeoutMs / 1e3)} seconds without finding the target position. Reading stopped.`
        );
      }
    }, remaining);
  };
  const server = import_node_http2.default.createServer((req, res) => {
    replies.add(res);
    res.once("close", () => replies.delete(res));
    if (failure || req.url !== "/media" || !["GET", "HEAD"].includes(req.method || "")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const range = req.headers.range || "bytes=0-";
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416);
      res.end();
      return;
    }
    const start = Number(match[1]);
    const askedEnd = match[2] ? Number(match[2]) : void 0;
    const sequential = start === lastServedEnd + 1;
    const window = sequential ? STREAM_WINDOW : PROBE_WINDOW;
    const send = (url, redirects = 0) => {
      seen.add(start);
      stats.uniqueRanges = seen.size;
      stats.ranges.push({ start, atMs: Date.now() - started });
      if (++stats.requests > maxRequests) {
        fail(
          `More than ${maxRequests} range requests were made. Reading stopped without falling back to a full-file scan.`
        );
        return;
      }
      if (!["http:", "https:"].includes(url.protocol)) {
        fail("The redirect isn't an HTTP/HTTPS URL.");
        return;
      }
      const upstreamStart = start;
      const knownTotal = stats.totalBytes;
      let upstreamEnd = askedEnd !== void 0 ? askedEnd : start + window - 1;
      if (knownTotal && knownTotal > 0) upstreamEnd = Math.min(upstreamEnd, knownTotal - 1);
      if (upstreamEnd < upstreamStart) {
        res.writeHead(416, knownTotal ? { "Content-Range": `bytes */${knownTotal}` } : void 0);
        res.end();
        return;
      }
      const upstream = (url.protocol === "https:" ? import_node_https2.default : import_node_http2.default).request(
        url,
        {
          agent: url.protocol === "https:" ? httpsAgent : httpAgent,
          method: req.method,
          headers: { Range: `bytes=${upstreamStart}-${upstreamEnd}`, "Accept-Encoding": "identity" }
        },
        (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
            response.destroy();
            if (redirects >= 5) {
              fail("The video redirected too many times.");
              return;
            }
            send(new URL(response.headers.location, url), redirects + 1);
            return;
          }
          const returnedRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(response.headers["content-range"] || ""));
          if (response.statusCode !== 206 || !returnedRange || Number(returnedRange[1]) !== upstreamStart) {
            response.destroy();
            fail(
              `The video server didn't return a valid byte-range response (HTTP ${response.statusCode}), so fast seeking isn't possible.`
            );
            return;
          }
          const total = Number(returnedRange[3]);
          if (Number.isFinite(total) && total > 0 && (!stats.totalBytes || total > stats.totalBytes)) {
            stats.totalBytes = total;
            budget = computeMediaBudget(initialProbe, total);
            maxRequests = Math.max(maxRequests, budget.maxRangeRequests);
            maxBytes = Math.max(maxBytes, budget.maxRangeBytes);
            socketIdleMs = Math.max(socketIdleMs, budget.socketIdleTimeoutMs);
            if (budget.locateTimeoutMs > locateTimeoutMs) {
              locateTimeoutMs = budget.locateTimeoutMs;
              resetLocateTimer(locateTimeoutMs);
            }
          }
          const type = String(response.headers["content-type"] || "");
          if (/html|json|xml/i.test(type)) {
            response.destroy();
            fail("The video URL returned text instead of media.");
            return;
          }
          const bodyEnd = Number(returnedRange[2]);
          res.writeHead(206, {
            "Content-Range": response.headers["content-range"],
            "Accept-Ranges": "bytes",
            ...response.headers["content-length"] ? { "Content-Length": response.headers["content-length"] } : {},
            "Content-Type": type || "application/octet-stream"
          });
          lastServedEnd = bodyEnd;
          response.on("data", (chunk) => {
            stats.bytes += chunk.length;
            if (stats.bytes > maxBytes) {
              response.destroy();
              fail(
                `This capture read more than ${Math.round(maxBytes / 1048576)} MiB. Reading stopped without falling back to a full download.`
              );
              return;
            }
            if (!res.write(chunk)) response.pause();
          });
          res.on("drain", () => response.resume());
          response.on("end", () => res.end());
          response.on("error", () => res.destroy());
        }
      );
      let retrying = false;
      clients.add(upstream);
      upstream.once("close", () => clients.delete(upstream));
      upstream.once("error", () => {
        if (!retrying && !res.destroyed) res.destroy();
      });
      upstream.setTimeout(socketIdleMs, () => {
        if (!res.headersSent && !res.destroyed && !failure && redirects < 2) {
          retrying = true;
          upstream.destroy();
          send(url, redirects + 1);
        } else {
          fail(`No video data for ${Math.round(socketIdleMs / 1e3)} seconds, and retrying didn't help.`);
        }
      });
      res.once("close", () => upstream.destroy());
      upstream.end();
    };
    send(new URL(target));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Couldn't create the local video read channel");
  resetLocateTimer(locateTimeoutMs);
  return {
    url: `http://127.0.0.1:${address.port}/media`,
    stats,
    error: () => failure,
    markLocated: () => {
      located = true;
      if (locateTimer) clearTimeout(locateTimer);
    },
    close: async () => {
      if (locateTimer) clearTimeout(locateTimer);
      for (const request of clients) request.destroy();
      httpAgent.destroy();
      httpsAgent.destroy();
      for (const reply of replies) reply.destroy();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

// src/lib/remote-window.ts
var import_node_fs9 = __toESM(require("node:fs"));
var import_node_http3 = __toESM(require("node:http"));
var import_node_https3 = __toESM(require("node:https"));
var import_node_path9 = __toESM(require("node:path"));
init_command_runner();
var RemoteWindowUnsupported = class extends Error {
};
var MIB2 = 1024 * 1024;
var HEAD_BYTES = 3 * MIB2;
var SAMPLE_BYTES = 256 * 1024;
var CHUNK_BYTES = 4 * MIB2;
var PARALLEL = 6;
var IDLE_TIMEOUT_MS = 45e3;
var RemoteFile = class {
  constructor(url, maxBytes, onProgress) {
    this.url = url;
    this.maxBytes = maxBytes;
    this.onProgress = onProgress;
    this.stats = { bytes: 0, requests: 0 };
    this.cancelPoll = setInterval(() => {
      if (isCancellationRequested()) {
        this.cancelled = true;
        this.abortAll();
      }
    }, 250);
  }
  stats;
  size = 0;
  httpAgent = new import_node_http3.default.Agent({ keepAlive: true, maxSockets: PARALLEL + 2 });
  httpsAgent = new import_node_https3.default.Agent({ keepAlive: true, maxSockets: PARALLEL + 2 });
  active = /* @__PURE__ */ new Set();
  cancelPoll;
  cancelled = false;
  abortAll() {
    for (const request of this.active) request.destroy(new Error("aborted"));
  }
  close() {
    clearInterval(this.cancelPoll);
    this.abortAll();
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
  /** Read [start, endExclusive), retrying transient network failures. */
  async read(start, endExclusive) {
    if (this.size > 0) endExclusive = Math.min(endExclusive, this.size);
    if (endExclusive <= start) return Buffer.alloc(0);
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.cancelled || isCancellationRequested()) throw new Error("Task stopped manually");
      try {
        const data = await this.readOnce(new URL(this.url), start, endExclusive - 1, 0);
        if (data.length !== endExclusive - start && (this.size === 0 || start + data.length < Math.min(endExclusive, this.size))) {
          throw new Error("short read");
        }
        return data;
      } catch (error) {
        if (error instanceof RemoteWindowUnsupported || error.fatal) throw error;
        if (this.cancelled || isCancellationRequested()) throw new Error("Task stopped manually");
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
    const reason = lastError instanceof Error && lastError.message === "idle" ? `no data for ${IDLE_TIMEOUT_MS / 1e3} seconds` : "network connection lost";
    throw Object.assign(new Error(`Couldn't read the video segment: ${reason} (retried 4 times).`), { fatal: true });
  }
  readOnce(url, start, endInclusive, redirects) {
    return new Promise((resolve, reject) => {
      const fatal = (message) => Object.assign(new Error(message), { fatal: true });
      if (++this.stats.requests > 4e3) {
        reject(fatal("Too many read requests. Stopped."));
        return;
      }
      const request = (url.protocol === "https:" ? import_node_https3.default : import_node_http3.default).request(
        url,
        {
          method: "GET",
          agent: url.protocol === "https:" ? this.httpsAgent : this.httpAgent,
          headers: { Range: `bytes=${start}-${endInclusive}`, "Accept-Encoding": "identity" }
        },
        (response) => {
          const status = response.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
            response.resume();
            if (redirects >= 5) {
              reject(fatal("The video URL redirected too many times."));
              return;
            }
            this.readOnce(new URL(response.headers.location, url), start, endInclusive, redirects + 1).then(
              resolve,
              reject
            );
            return;
          }
          if (status === 401 || status === 403) {
            response.resume();
            reject(fatal("The server denied access to the video (401/403). Check your token's permissions."));
            return;
          }
          if (status === 200) {
            response.destroy();
            reject(new RemoteWindowUnsupported("The server doesn't support byte-range reads (returned 200)."));
            return;
          }
          if (status === 416) {
            response.resume();
            reject(fatal("The requested position is beyond the end of the video file."));
            return;
          }
          if (status !== 206) {
            response.resume();
            reject(new Error(`HTTP ${status}`));
            return;
          }
          const type = String(response.headers["content-type"] || "");
          if (/html|json|xml/i.test(type)) {
            response.destroy();
            reject(fatal(`The video URL returned a web page or API text (${type}) instead of the original video.`));
            return;
          }
          const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(String(response.headers["content-range"] || ""));
          if (!range || Number(range[1]) !== start) {
            response.destroy();
            reject(new RemoteWindowUnsupported("The server returned a byte range that doesn't match the request."));
            return;
          }
          if (range[3] !== "*") {
            this.size = Number(range[3]);
            this.stats.totalBytes = this.size;
          }
          const chunks = [];
          response.on("data", (chunk) => {
            chunks.push(chunk);
            this.stats.bytes += chunk.length;
            if (this.stats.bytes > this.maxBytes) {
              response.destroy();
              reject(fatal(`This capture read more than ${Math.round(this.maxBytes / MIB2)} MiB. Reading stopped.`));
            }
          });
          response.on("end", () => {
            this.onProgress?.(this.stats);
            resolve(Buffer.concat(chunks));
          });
          response.on("error", reject);
          response.on("aborted", () => reject(new Error("aborted")));
        }
      );
      this.active.add(request);
      request.once("close", () => this.active.delete(request));
      request.setTimeout(IDLE_TIMEOUT_MS, () => request.destroy(new Error("idle")));
      request.once("error", (error) => {
        const code = error.code;
        if (code === "ENOTFOUND") reject(fatal("Couldn't resolve the video server's hostname."));
        else reject(error);
      });
      request.end();
    });
  }
  /** Download [start, endExclusive) into fd at fileOffset using parallel Range requests. */
  async downloadTo(fd, fileOffset, start, endExclusive) {
    const jobs = [];
    for (let s = start; s < endExclusive; s += CHUNK_BYTES) jobs.push([s, Math.min(s + CHUNK_BYTES, endExclusive)]);
    let next = 0;
    let failure;
    const worker = async () => {
      while (failure === void 0 && next < jobs.length) {
        const [a, b] = jobs[next++];
        try {
          const data = await this.read(a, b);
          await new Promise(
            (resolve, reject) => import_node_fs9.default.write(
              fd,
              data,
              0,
              data.length,
              fileOffset + (a - start),
              (error) => error ? reject(error) : resolve()
            )
          );
        } catch (error) {
          failure ??= error;
          this.abortAll();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));
    if (failure !== void 0) throw failure;
  }
};
async function readHead(file) {
  const first = await file.read(0, MIB2);
  if (file.size > 0 && file.size <= MIB2) return first;
  const parts = await Promise.all([file.read(MIB2, 2 * MIB2), file.read(2 * MIB2, HEAD_BYTES)]);
  return Buffer.concat([first, ...parts]);
}
function classifyHead(head) {
  for (let offset = 32768; offset + 6 <= Math.min(head.length, 65536); offset += 2048) {
    if (["CD001", "BEA01", "NSR02", "NSR03"].includes(head.subarray(offset + 1, offset + 6).toString("ascii")))
      return "disc";
  }
  if (head.length >= 4 && head.readUInt32BE(0) === 440786851) return "mkv";
  if (detectTsLayout(head)) return "ts";
  return "other";
}
function detectTsLayout(buf, from = 0) {
  for (const packetSize of [188, 192]) {
    for (let o = from; o < from + packetSize && o + packetSize * 15 < buf.length; o++) {
      let ok = true;
      for (let k = 0; k < 16; k++)
        if (buf[o + k * packetSize] !== 71) {
          ok = false;
          break;
        }
      if (ok) return { packetSize, syncOffset: o };
    }
  }
  return void 0;
}
var VIDEO_STREAM_TYPES = /* @__PURE__ */ new Set([1, 2, 16, 27, 36, 51, 234]);
var NO_PTS_STREAM_IDS = /* @__PURE__ */ new Set([188, 190, 191, 240, 241, 242, 248, 255]);
function readPesTimestamp(b, i) {
  return (b[i] >> 1 & 7) * 1073741824 + (b[i + 1] << 22 | b[i + 2] >> 1 << 15 | b[i + 3] << 7 | b[i + 4] >> 1);
}
function scanTs(buf, layout, knownVideoPid) {
  const out = { video: [], other: [], pcr: [], videoPid: knownVideoPid };
  const pmtPids = /* @__PURE__ */ new Set();
  for (let p = layout.syncOffset; p + 188 <= buf.length; p += layout.packetSize) {
    if (buf[p] !== 71) continue;
    const pid = (buf[p + 1] & 31) << 8 | buf[p + 2];
    const pusi = (buf[p + 1] & 64) !== 0;
    const afc = buf[p + 3] >> 4 & 3;
    let off = p + 4;
    if (afc & 2) {
      const alen = buf[off];
      if (alen >= 7 && buf[off + 1] & 16) {
        out.pcr.push(
          buf[off + 2] * 33554432 + buf[off + 3] * 131072 + buf[off + 4] * 512 + buf[off + 5] * 2 + (buf[off + 6] >> 7)
        );
      }
      off += 1 + alen;
    }
    if (!(afc & 1) || !pusi || off + 19 > p + 188) continue;
    if (pid === 0) {
      const t = off + 1 + buf[off];
      const end = Math.min(t + 3 + ((buf[t + 1] & 15) << 8 | buf[t + 2]) - 4, p + 188);
      for (let i = t + 8; i + 4 <= end; i += 4) {
        if ((buf[i] << 8 | buf[i + 1]) !== 0) pmtPids.add((buf[i + 2] & 31) << 8 | buf[i + 3]);
      }
      continue;
    }
    if (pmtPids.has(pid) && out.videoPid === void 0) {
      const t = off + 1 + buf[off];
      if (buf[t] !== 2) continue;
      const end = Math.min(t + 3 + ((buf[t + 1] & 15) << 8 | buf[t + 2]) - 4, p + 188);
      let i = t + 12 + ((buf[t + 10] & 15) << 8 | buf[t + 11]);
      while (i + 5 <= end) {
        if (VIDEO_STREAM_TYPES.has(buf[i])) {
          out.videoPid = (buf[i + 1] & 31) << 8 | buf[i + 2];
          break;
        }
        i += 5 + ((buf[i + 3] & 15) << 8 | buf[i + 4]);
      }
      continue;
    }
    if (buf[off] !== 0 || buf[off + 1] !== 0 || buf[off + 2] !== 1 || NO_PTS_STREAM_IDS.has(buf[off + 3])) continue;
    const flags = buf[off + 7] >> 6;
    if (!(flags & 2)) continue;
    const pts = readPesTimestamp(buf, off + 9);
    const dts = flags === 3 ? readPesTimestamp(buf, off + 14) : pts;
    (pid === out.videoPid ? out.video : out.other).push(dts);
  }
  return out;
}
function median(values) {
  if (!values.length) return void 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
var WRAP = 2 ** 33;
var TsLocator = class {
  constructor(file, layout, videoPid, referenceRaw) {
    this.file = file;
    this.layout = layout;
    this.videoPid = videoPid;
    this.referenceRaw = referenceRaw;
  }
  align(pos) {
    const base = this.layout.syncOffset - (this.layout.packetSize === 192 ? 4 : 0);
    return Math.max(0, base + Math.floor((pos - base) / this.layout.packetSize) * this.layout.packetSize);
  }
  seconds(raw) {
    let value = raw;
    while (value < this.referenceRaw - WRAP / 2) value += WRAP;
    return value / 9e4;
  }
  async timeAt(pos) {
    const start = this.align(Math.min(Math.max(0, pos), Math.max(0, this.file.size - SAMPLE_BYTES)));
    const buf = await this.file.read(start, start + SAMPLE_BYTES);
    const layout = detectTsLayout(buf);
    if (!layout) return void 0;
    const scan = scanTs(buf, layout, this.videoPid);
    const raw = median(scan.video) ?? median(scan.other) ?? median(scan.pcr);
    return raw === void 0 ? void 0 : this.seconds(raw);
  }
  /** before: returns a position whose time is <= target; after: a position whose time is >= target. */
  async locate(target, mode, startSec, endSec) {
    let lo = { pos: 0, t: startSec };
    let hi = { pos: this.file.size, t: endSec };
    if (mode === "before" && target <= startSec) return 0;
    if (mode === "after" && target >= endSec) return this.file.size;
    for (let iteration = 0; iteration < 16; iteration++) {
      const span = hi.pos - lo.pos;
      if (span <= SAMPLE_BYTES * 4) break;
      let guess = lo.pos + (target - lo.t) / Math.max(1e-6, hi.t - lo.t) * span;
      guess = Math.min(Math.max(guess, lo.pos + span * 0.01), hi.pos - span * 0.01);
      const t = await this.timeAt(guess);
      if (t === void 0) throw new RemoteWindowUnsupported("No usable timestamp in the TS sample.");
      if (t < lo.t - 10 || t > hi.t + 10)
        throw new RemoteWindowUnsupported("TS timestamps are discontinuous; can't seek by byte offset.");
      if (t <= target) {
        lo = { pos: guess, t };
        if (mode === "before" && target - t <= 2.5) break;
      } else {
        hi = { pos: guess, t };
        if (mode === "after" && t - target <= 2.5) break;
      }
    }
    return mode === "before" ? this.align(lo.pos) : this.align(hi.pos + SAMPLE_BYTES);
  }
};
var MKV = {
  EBML: 440786851,
  Segment: 408125543,
  SeekHead: 290298740,
  Seek: 19899,
  SeekID: 21419,
  SeekPosition: 21420,
  Info: 357149030,
  TimestampScale: 2807729,
  Tracks: 374648427,
  TrackEntry: 174,
  TrackNumber: 215,
  TrackType: 131,
  Cues: 475249515,
  CuePoint: 187,
  CueTime: 179,
  CueTrackPositions: 183,
  CueTrack: 247,
  CueClusterPosition: 241,
  Cluster: 524531317
};
function readVint(b, i, keepMarker) {
  if (i >= b.length) return void 0;
  const first = b[i];
  if (first === 0) return void 0;
  let length = 1;
  while (!(first & 128 >> length - 1)) length++;
  if (i + length > b.length) return void 0;
  let value = keepMarker ? first : first & 255 >> length;
  let allOnes = value === 255 >> length;
  for (let k = 1; k < length; k++) {
    value = value * 256 + b[i + k];
    if (b[i + k] !== 255) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}
function readElement(b, i, base = 0) {
  const id = readVint(b, i, true);
  if (!id || id.length > 4) return void 0;
  const size = readVint(b, i + id.length, false);
  if (!size) return void 0;
  const dataPos = i + id.length + size.length;
  const length = size.unknown ? Infinity : size.value;
  return { id: id.value, pos: base + i, dataPos: base + dataPos, size: length, end: base + dataPos + length };
}
function children(b, start, end) {
  const out = [];
  let i = start;
  while (i < Math.min(end, b.length)) {
    const element = readElement(b, i);
    if (!element || !Number.isFinite(element.size)) break;
    out.push({ ...element, local: element.dataPos });
    i = element.end;
  }
  return out;
}
function readUint(b, start, size) {
  let value = 0;
  for (let k = 0; k < size; k++) value = value * 256 + b[start + k];
  return value;
}
async function readMkvLayout(file, head) {
  const ebml = readElement(head, 0);
  if (!ebml || ebml.id !== MKV.EBML || !Number.isFinite(ebml.end))
    throw new RemoteWindowUnsupported("Invalid MKV header.");
  const segment = readElement(head, ebml.end);
  if (!segment || segment.id !== MKV.Segment) throw new RemoteWindowUnsupported("MKV is missing a Segment.");
  const segmentDataPos = segment.dataPos;
  const segmentEnd = Number.isFinite(segment.end) ? Math.min(segment.end, file.size || segment.end) : file.size;
  const fetchElement = async (pos2) => {
    const peek = pos2 + 16 <= head.length ? head.subarray(pos2, pos2 + 16) : await file.read(pos2, pos2 + 16);
    const element = readElement(peek, 0, pos2);
    if (!element || !Number.isFinite(element.size)) throw new RemoteWindowUnsupported("Couldn't parse an MKV element.");
    if (element.end - pos2 > 64 * MIB2) throw new RemoteWindowUnsupported("MKV index is too large.");
    const bytes = element.end <= head.length ? head.subarray(pos2, element.end) : await file.read(pos2, element.end);
    return { element, bytes };
  };
  const positions = /* @__PURE__ */ new Map();
  let firstCluster = 0;
  let pos = segmentDataPos;
  for (let hop = 0; hop < 64 && pos < segmentEnd; hop++) {
    const peek = pos + 16 <= head.length ? head.subarray(pos, pos + 16) : await file.read(pos, pos + 16);
    const element = readElement(peek, 0, pos);
    if (!element) break;
    if (element.id === MKV.Cluster) {
      firstCluster = pos;
      break;
    }
    if (!positions.has(element.id)) positions.set(element.id, pos);
    if (!Number.isFinite(element.size)) break;
    pos = element.end;
  }
  if (!firstCluster) throw new RemoteWindowUnsupported("No video clusters found in the MKV.");
  const seekHeadPos = positions.get(MKV.SeekHead);
  if (seekHeadPos !== void 0) {
    const { element, bytes } = await fetchElement(seekHeadPos);
    for (const seek of children(bytes, element.dataPos - seekHeadPos, bytes.length)) {
      if (seek.id !== MKV.Seek) continue;
      let id = 0;
      let position = -1;
      for (const field of children(bytes, seek.local, seek.local + seek.size)) {
        if (field.id === MKV.SeekID) id = readUint(bytes, field.local, field.size);
        if (field.id === MKV.SeekPosition) position = readUint(bytes, field.local, field.size);
      }
      if (id && position >= 0 && !positions.has(id)) positions.set(id, segmentDataPos + position);
    }
  }
  const infoPos = positions.get(MKV.Info);
  const tracksPos = positions.get(MKV.Tracks);
  const cuesPos = positions.get(MKV.Cues);
  if (infoPos === void 0 || tracksPos === void 0)
    throw new RemoteWindowUnsupported("MKV is missing Info/Tracks.");
  if (cuesPos === void 0) throw new RemoteWindowUnsupported("MKV has no Cues index.");
  const [info, tracks, cues] = await Promise.all([
    fetchElement(infoPos),
    fetchElement(tracksPos),
    fetchElement(cuesPos)
  ]);
  let timestampScale = 1e6;
  for (const field of children(info.bytes, info.element.dataPos - infoPos, info.bytes.length)) {
    if (field.id === MKV.TimestampScale) timestampScale = readUint(info.bytes, field.local, field.size);
  }
  let videoTrack;
  for (const entry of children(tracks.bytes, tracks.element.dataPos - tracksPos, tracks.bytes.length)) {
    if (entry.id !== MKV.TrackEntry) continue;
    let number = 0;
    let type = 0;
    for (const field of children(tracks.bytes, entry.local, entry.local + entry.size)) {
      if (field.id === MKV.TrackNumber) number = readUint(tracks.bytes, field.local, field.size);
      if (field.id === MKV.TrackType) type = readUint(tracks.bytes, field.local, field.size);
    }
    if (type === 1) {
      videoTrack = number;
      break;
    }
  }
  const cuePoints = [];
  for (const point of children(cues.bytes, cues.element.dataPos - cuesPos, cues.bytes.length)) {
    if (point.id !== MKV.CuePoint) continue;
    let time = -1;
    const tracksAt = [];
    for (const field of children(cues.bytes, point.local, point.local + point.size)) {
      if (field.id === MKV.CueTime) time = readUint(cues.bytes, field.local, field.size);
      if (field.id === MKV.CueTrackPositions) {
        let track = 0;
        let cluster = -1;
        for (const sub of children(cues.bytes, field.local, field.local + field.size)) {
          if (sub.id === MKV.CueTrack) track = readUint(cues.bytes, sub.local, sub.size);
          if (sub.id === MKV.CueClusterPosition) cluster = readUint(cues.bytes, sub.local, sub.size);
        }
        if (cluster >= 0) tracksAt.push({ track, pos: segmentDataPos + cluster });
      }
    }
    if (time >= 0) for (const entry of tracksAt) cuePoints.push({ time: time * timestampScale / 1e9, ...entry });
  }
  const forVideo = cuePoints.filter((cue) => cue.track === videoTrack);
  const selected = (forVideo.length ? forVideo : cuePoints).sort((a, b) => a.time - b.time);
  if (selected.length < 2) throw new RemoteWindowUnsupported("MKV index has too few entries.");
  for (let i = 1; i < selected.length; i++) {
    if (selected[i].pos < selected[i - 1].pos)
      throw new RemoteWindowUnsupported("MKV index positions aren't monotonically increasing.");
  }
  return {
    ebmlHeader: head.subarray(0, ebml.end),
    info: info.bytes,
    tracks: tracks.bytes,
    segmentDataPos,
    segmentEnd,
    firstCluster,
    timestampScale,
    videoTrack,
    cues: selected
  };
}
function mkvSyntheticHeader(layout) {
  const segment = Buffer.from([24, 83, 128, 103, 1, 255, 255, 255, 255, 255, 255, 255]);
  return Buffer.concat([layout.ebmlHeader, segment, layout.info, layout.tracks]);
}
async function probeStartTime(ffprobePath, file, env) {
  const { stdout } = await runCommand(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=start_time", "-of", "default=nw=1:nk=1", file],
    { env, timeout: 3e4, maxBuffer: 1024 * 1024 }
  );
  const value = Number(stdout.trim());
  if (!Number.isFinite(value))
    throw new RemoteWindowUnsupported("Couldn't determine the start time from the file header.");
  return value;
}
async function videoPtsRange(ffprobePath, file, env) {
  const { stdout } = await runCommand(
    ffprobePath,
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", file],
    { env, timeout: 12e4, maxBuffer: 32 * MIB2 }
  );
  const values = stdout.split("\n").map((line) => line.split(",")[0].trim()).filter(Boolean).map(Number).filter(Number.isFinite);
  if (values.length < 2) return { first: NaN, last: NaN };
  return { first: Math.min(...values), last: Math.max(...values) };
}
async function writeFile(target, data) {
  await import_node_fs9.default.promises.writeFile(target, data);
}
async function openRemoteWindow(request) {
  const file = new RemoteFile(request.url, request.maxBytes, request.onProgress);
  let head;
  try {
    head = await readHead(file);
  } catch (error) {
    file.close();
    throw error;
  }
  const kind = classifyHead(head);
  file.stats.format = kind;
  return {
    kind,
    stats: file.stats,
    close: () => file.close(),
    fetch: () => kind === "ts" ? fetchTsWindow(file, head, request) : kind === "mkv" ? fetchMkvWindow(file, head, request) : Promise.reject(new RemoteWindowUnsupported("Not a TS/MKV file."))
  };
}
async function fetchTsWindow(file, head, request) {
  const layout = detectTsLayout(head);
  if (!layout) throw new RemoteWindowUnsupported("Invalid TS sync bytes.");
  const headScan = scanTs(head, layout);
  const headRaw = median(headScan.video) ?? median(headScan.other) ?? median(headScan.pcr);
  if (headRaw === void 0) throw new RemoteWindowUnsupported("TS header has no timestamp.");
  const headPath = import_node_path9.default.join(request.workDir, "_head.ts");
  await writeFile(headPath, head);
  const [sourceStartSec, tailBuf] = await Promise.all([
    probeStartTime(request.ffprobePath, headPath, request.env).finally(() => import_node_fs9.default.rmSync(headPath, { force: true })),
    file.read(Math.max(0, file.size - SAMPLE_BYTES), file.size)
  ]);
  const locator = new TsLocator(file, layout, headScan.videoPid, headRaw);
  const startSec = locator.seconds(headRaw);
  const tailLayout = detectTsLayout(tailBuf);
  const tailScan = tailLayout ? scanTs(tailBuf, tailLayout, headScan.videoPid) : void 0;
  const tailRaw = tailScan ? median(tailScan.video) ?? median(tailScan.other) ?? median(tailScan.pcr) : void 0;
  const endSec = tailRaw !== void 0 ? locator.seconds(tailRaw) : request.durationHintSec ? startSec + request.durationHintSec : NaN;
  if (!Number.isFinite(endSec) || endSec <= startSec)
    throw new RemoteWindowUnsupported("Couldn't determine the TS duration.");
  const sourceTargetSec = sourceStartSec + request.targetPlayerSec;
  const output = import_node_path9.default.join(request.workDir, "_window.ts");
  for (let attempt = 0; attempt < 2; attempt++) {
    const extraPre = attempt * 6;
    const extraPost = attempt * 4;
    request.onStage?.("Locating the target frame in the remote file\u2026");
    const [a, b] = await Promise.all([
      locator.locate(sourceTargetSec - request.prerollSec - 1.5 - extraPre, "before", startSec, endSec),
      locator.locate(sourceTargetSec + request.postrollSec + 1.5 + extraPost, "after", startSec, endSec)
    ]);
    if (b <= a) throw new RemoteWindowUnsupported("Invalid TS seek range.");
    if (b - a > request.maxWindowBytes)
      throw new Error(`The segment near the target is too large (${Math.round((b - a) / MIB2)} MiB). Reading stopped.`);
    file.stats.windowBytes = b - a;
    request.onStage?.(`Downloading ${Math.round((b - a) / MIB2)} MiB near the target (${PARALLEL} parallel streams)\u2026`);
    const fd = import_node_fs9.default.openSync(output, "w");
    try {
      await file.downloadTo(fd, 0, a, b);
    } finally {
      import_node_fs9.default.closeSync(fd);
    }
    const range = await videoPtsRange(request.ffprobePath, output, request.env);
    if (range.first <= sourceTargetSec - Math.min(1, request.prerollSec) && range.last >= sourceTargetSec + 0.1) {
      return {
        kind: "ts",
        mediaPath: output,
        sourceStartSec,
        sourceTargetSec,
        firstVideoPts: range.first,
        lastVideoPts: range.last
      };
    }
  }
  import_node_fs9.default.rmSync(output, { force: true });
  throw new RemoteWindowUnsupported("The downloaded TS segment doesn't cover the target time.");
}
async function fetchMkvWindow(file, head, request) {
  request.onStage?.("Reading MKV index\u2026");
  const layout = await readMkvLayout(file, head);
  const header = mkvSyntheticHeader(layout);
  const startProbe = import_node_path9.default.join(request.workDir, "_head.mkv");
  const firstClusterBytes = layout.firstCluster + 2 * MIB2 <= head.length ? head.subarray(layout.firstCluster, layout.firstCluster + 2 * MIB2) : await file.read(layout.firstCluster, layout.firstCluster + 2 * MIB2);
  await writeFile(startProbe, Buffer.concat([header, firstClusterBytes]));
  const sourceStartSec = await probeStartTime(request.ffprobePath, startProbe, request.env).finally(
    () => import_node_fs9.default.rmSync(startProbe, { force: true })
  );
  const sourceTargetSec = sourceStartSec + request.targetPlayerSec;
  const output = import_node_path9.default.join(request.workDir, "_window.mkv");
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = sourceTargetSec - request.prerollSec - 0.5 - attempt * 6;
    const to = sourceTargetSec + request.postrollSec + 0.5 + attempt * 4;
    const before = layout.cues.filter((cue) => cue.time <= from);
    const a = before.length ? before[before.length - 1].pos : layout.firstCluster;
    const b = layout.cues.find((cue) => cue.time >= to)?.pos ?? layout.segmentEnd;
    if (b <= a) throw new RemoteWindowUnsupported("Invalid MKV seek range.");
    if (b - a > request.maxWindowBytes)
      throw new Error(`The segment near the target is too large (${Math.round((b - a) / MIB2)} MiB). Reading stopped.`);
    file.stats.windowBytes = b - a;
    request.onStage?.(`Downloading ${Math.round((b - a) / MIB2)} MiB near the target (${PARALLEL} parallel streams)\u2026`);
    const fd = import_node_fs9.default.openSync(output, "w");
    try {
      import_node_fs9.default.writeSync(fd, header, 0, header.length, 0);
      await file.downloadTo(fd, header.length, a, b);
    } finally {
      import_node_fs9.default.closeSync(fd);
    }
    const range = await videoPtsRange(request.ffprobePath, output, request.env);
    if (range.first <= sourceTargetSec && range.last >= sourceTargetSec) {
      return {
        kind: "mkv",
        mediaPath: output,
        sourceStartSec,
        sourceTargetSec,
        firstVideoPts: range.first,
        lastVideoPts: range.last
      };
    }
  }
  import_node_fs9.default.rmSync(output, { force: true });
  throw new RemoteWindowUnsupported("The downloaded MKV segment doesn't cover the target time.");
}

// src/lib/source-format.ts
var import_node_path10 = __toESM(require("node:path"));
function isDiscSource(probe) {
  let pathname = probe.mediaTarget;
  try {
    pathname = new URL(pathname).pathname;
  } catch {
  }
  const container = (probe.container || import_node_path10.default.extname(pathname).slice(1)).toLowerCase();
  return ["iso", "img", "bdmv"].includes(container) || /(?:^|\/)BDMV(?:\/|$)/i.test(pathname);
}
function assertReadableVideoSource(probe) {
  let pathname = probe.mediaTarget;
  try {
    pathname = new URL(pathname).pathname;
  } catch {
  }
  const container = (probe.container || import_node_path10.default.extname(pathname).slice(1)).toLowerCase();
  if (["iso", "img", "bdmv", "dvd"].includes(container) || /(?:^|\/)BDMV(?:\/|$)/i.test(pathname)) {
    throw new Error(
      "This source is a disc image or disc folder, which can't be captured directly yet. The disc file system and main playlist must be read first; an ISO URL can't be read as a regular video. As a workaround, capture from a lossless MKV remux."
    );
  }
}

// src/lib/disc-detection.ts
var import_node_http4 = __toESM(require("node:http"));
async function detectRemoteDisc(target) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    if (url.hostname !== "127.0.0.1" || url.protocol !== "http:") {
      reject(new Error("Disc detection must go through the restricted read channel"));
      return;
    }
    let data = Buffer.alloc(0);
    const req = import_node_http4.default.get(url, { headers: { Range: "bytes=32768-65535" } }, (response) => {
      if (response.statusCode === 416) {
        response.resume();
        resolve(false);
        return;
      }
      if (response.statusCode !== 206) {
        response.destroy();
        reject(new Error("Couldn't read the disc identifier"));
        return;
      }
      response.on("data", (chunk) => {
        data = Buffer.concat([data, chunk]);
        if (data.length > 32768) response.destroy(new Error("Disc identifier response is too large"));
      });
      response.on("end", () => {
        let found = false;
        for (let offset = 0; offset + 6 <= data.length; offset += 2048) {
          const id = data.subarray(offset + 1, offset + 6).toString("ascii");
          if (["CD001", "BEA01", "NSR02", "NSR03"].includes(id)) found = true;
        }
        resolve(found);
      });
      response.on("error", reject);
    });
    req.setTimeout(15e3, () => req.destroy(new Error("Timed out reading the disc identifier")));
    req.once("error", reject);
  });
}

// src/lib/pgs-canvas.ts
var import_node_fs10 = __toESM(require("node:fs"));
function readPgsCanvas(file) {
  const data = import_node_fs10.default.readFileSync(file);
  for (let offset = 0; offset + 13 <= data.length; ) {
    if (data[offset] !== 80 || data[offset + 1] !== 71) break;
    const type = data[offset + 10], size = data.readUInt16BE(offset + 11);
    if (offset + 13 + size > data.length) break;
    if (type === 22 && size >= 4) {
      const width = data.readUInt16BE(offset + 13), height = data.readUInt16BE(offset + 15);
      if (width > 0 && height > 0 && width <= 8192 && height <= 8192) return { width, height };
    }
    offset += size + 13;
  }
  return void 0;
}

// src/lib/media-engine.ts
init_hdr_overlay();

// src/lib/frame-selection.ts
init_command_runner();
function pickSourceStart(meta) {
  const candidates = [meta.format?.start_time, meta.streams?.[0]?.start_time];
  for (const raw of candidates) {
    if (raw === void 0 || raw === "N/A") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}
function rational(value) {
  const [n, d] = value.split("/").map(Number);
  return n / d;
}
async function selectDisplayedFrame(input) {
  if (!Number.isFinite(input.requestedTitleSec) || input.requestedTitleSec < 0) {
    throw new Error("The player didn't report a valid capture time.");
  }
  const metadata = await runCommand(
    input.ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=avg_frame_rate,time_base,start_time:format=start_time",
      "-of",
      "json",
      input.mediaPath
    ],
    { env: input.env, timeout: input.timeoutMs ?? 3e4, maxBuffer: 1024 * 1024 }
  );
  const meta = JSON.parse(metadata.stdout);
  const stream = meta.streams?.[0];
  const timeBase = stream?.time_base;
  const tick = typeof timeBase === "string" ? rational(timeBase) : NaN;
  const fps = rational(stream?.avg_frame_rate || "0/0");
  const start = pickSourceStart(meta);
  const target = input.sourceTargetPTS ?? input.requestedTitleSec + start;
  if (!Number.isFinite(target) || !Number.isFinite(tick) || tick <= 0) {
    throw new Error("The video source has an invalid timeline.");
  }
  const decoded = await runCommand(
    input.ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-read_intervals",
      `${Math.max(0, target - 8).toFixed(6)}%${(target + 2).toFixed(6)}`,
      "-show_entries",
      "frame=best_effort_timestamp,best_effort_timestamp_time,key_frame",
      "-of",
      "json",
      input.mediaPath
    ],
    { env: input.env, timeout: input.timeoutMs ?? 6e4, maxBuffer: 16 * 1024 * 1024 }
  );
  const frames = (JSON.parse(decoded.stdout).frames || []).map((f) => ({
    pts: Number(f.best_effort_timestamp_time),
    ticks: Number(f.best_effort_timestamp),
    key: f.key_frame === 1
  })).filter((f) => Number.isFinite(f.pts) && Number.isSafeInteger(f.ticks)).sort((a, b) => a.pts - b.pts);
  if (!frames.length) throw new Error("No valid video frames were decoded near the target time.");
  const gapsAll = frames.slice(1).map((f, i) => f.pts - frames[i].pts).filter((g) => g > 0).sort((a, b) => a - b);
  const nominal = Number.isFinite(fps) && fps > 0 ? 1 / fps : gapsAll[Math.floor(gapsAll.length / 2)] ?? NaN;
  const slack = Math.min(Math.max(1e-3, 2 * tick), Number.isFinite(nominal) ? nominal / 4 : 1e-3);
  const next = frames.findIndex((f) => f.pts > target + slack);
  const index = next < 0 ? frames.length - 1 : next - 1;
  if (index < 0)
    throw new Error("The target time is before the decodable segment; a nearby keyframe can't be used instead.");
  const selected = frames[index];
  const gaps = [
    index > 0 ? selected.pts - frames[index - 1].pts : 0,
    index + 1 < frames.length ? frames[index + 1].pts - selected.pts : 0
  ].filter((g) => g > 0);
  const interval = gaps.length ? Math.min(...gaps) : nominal;
  const tolerance = interval + Math.max(tick, 1e-6);
  if (!Number.isFinite(tolerance) || target - selected.pts > tolerance || next < 0 && target - selected.pts > interval / 2) {
    throw new Error("The local video frames don't cover the target time. Capture stopped.");
  }
  return {
    requestedTitleSec: input.requestedTitleSec,
    sourceTargetPTS: target,
    selectedPTS: selected.pts,
    selectedTitleSec: input.requestedTitleSec + selected.pts - target,
    selectedPtsTicks: selected.ticks,
    timeBase,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 1 / interval,
    toleranceSec: tolerance,
    errorSec: selected.pts - target,
    isKeyframe: selected.key,
    sourceStartSec: input.sourceTargetPTS === void 0 ? start : void 0,
    policy: "displayed-pts"
  };
}
function verifyDecodedFrame(stderr, selection) {
  const match = /\bn:\s*0\s+pts:\s*(-?\d+)\s+pts_time:\s*([-+\d.eE]+)/.exec(stderr);
  if (!match || Number(match[1]) !== selection.selectedPtsTicks) {
    throw new Error("The decoded frame time doesn't match the selected video frame. Capture stopped.");
  }
  return Number(match[1]) * rational(selection.timeBase);
}

// src/lib/source-lease.ts
var import_node_child_process4 = require("node:child_process");
var import_promises3 = __toESM(require("node:fs/promises"));
var import_node_path12 = __toESM(require("node:path"));
var tails = /* @__PURE__ */ new Map();
async function acquireSourceLease(supportPath, key) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid source preparation key.");
  const root = import_node_path12.default.join(supportPath, "source-leases-v1");
  const lock = import_node_path12.default.join(root, key);
  const previous = tails.get(lock);
  let unlock;
  const tail = new Promise((resolve) => {
    unlock = resolve;
  });
  tails.set(lock, tail);
  let waited = Boolean(previous);
  let acquired = false;
  const finish = () => {
    if (tails.get(lock) === tail) tails.delete(lock);
    unlock();
  };
  try {
    await previous;
    await import_promises3.default.mkdir(root, { recursive: true, mode: 448 });
    const deadline = Date.now() + 24e4;
    while (!acquired) {
      try {
        (0, import_node_child_process4.execFileSync)("/usr/bin/shlock", ["-f", lock, "-p", String(process.pid)], { stdio: "ignore" });
        acquired = true;
      } catch {
        waited = true;
        if (Date.now() >= deadline)
          throw new Error(
            "Timed out waiting for another segment of the same video to finish preparing. Try again later."
          );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    finish();
    throw error;
  }
  let releasing;
  return {
    waited,
    release: () => releasing ??= (async () => {
      try {
        const owner = (await import_promises3.default.readFile(lock, "utf8")).trim();
        if (owner === String(process.pid)) await import_promises3.default.rm(lock, { force: true });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      } finally {
        finish();
      }
    })()
  };
}

// src/lib/media-engine.ts
var PREROLL_SECONDS = 8;
var POSTROLL_SECONDS = 8;
var WINDOW_POSTROLL_SECONDS = 1.5;
function remoteInputFlags(isRemote) {
  if (!isRemote) return [];
  return [
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_on_network_error",
    "1",
    "-rw_timeout",
    "210000000"
  ];
}
function mergeSubtitleStreams(probedStreams, sessionStreams) {
  if (probedStreams.length === 0) return sessionStreams;
  if (sessionStreams.length === 0) return probedStreams;
  return probedStreams.map((localSt) => {
    const match = sessionStreams.find((s) => s.subOrdinal === localSt.subOrdinal);
    if (!match) return localSt;
    return {
      ...localSt,
      // Keep original container stream index for display clarity, while subOrdinal addresses 0:s:k
      index: match.index ?? localSt.index,
      language: localSt.language !== "und" ? localSt.language : match.language,
      title: match.title || localSt.title,
      isChinese: localSt.isChinese || match.isChinese,
      isEnglish: localSt.isEnglish || match.isEnglish
    };
  });
}
async function hasVisibleAlphaPixels(ffmpegPath, pngPath, env) {
  if (!import_node_fs12.default.existsSync(pngPath)) return false;
  try {
    const { stderr } = await runCommand(
      ffmpegPath,
      ["-hide_banner", "-i", pngPath, "-vf", "alphaextract,bbox", "-f", "null", "-"],
      { env, timeout: 8e3 }
    );
    return stderr.includes("crop=");
  } catch {
    throw new Error("Couldn't determine subtitle transparency; a read failure can't be treated as no dialogue.");
  }
}
async function recomposeCaptureOutputs(manifest, supportPath, ffmpegPath, bypassProxy = true, mergeIntoDisk = false) {
  if (manifest.exportSignatures) {
    for (const file of [manifest.cleanPngPath, manifest.subbedPngPath, manifest.layeredSvgPath]) {
      const expected = manifest.exportSignatures[file];
      if (!expected) continue;
      let current = "";
      try {
        const stat = import_node_fs12.default.statSync(file);
        current = `${stat.size}:${stat.mtimeMs}`;
      } catch {
      }
      if (current !== expected)
        throw new Error(
          "The exported file was modified or deleted locally. Layer re-rendering stopped to avoid overwriting external edits. Keep the external version or capture again to start a new project."
        );
    }
  }
  const env = buildExecutionEnv(bypassProxy);
  const { width, height, isPq, colorPrimaries, colorTransfer, colorSpace } = manifest.colorInfo;
  const barPad = manifest.cinemaBar ? Math.round(height * 0.12) : 0;
  const totalHeight = height + barPad * 2;
  const videoY = barPad;
  const svgXml = buildLayeredSvg(manifest);
  import_node_fs12.default.writeFileSync(manifest.layeredSvgPath, svgXml, "utf-8");
  const visibleBitmaps = manifest.layers.filter(
    (l) => l.visible && l.kind === "bitmap" && l.bitmapFilename && import_node_fs12.default.existsSync(import_node_path13.default.join(manifest.projectDir, l.bitmapFilename))
  );
  const visibleTexts = manifest.layers.filter(
    (l) => l.visible && l.kind === "text" && (l.text ?? "").trim().length > 0
  );
  let tempTextPng = null;
  if (visibleTexts.length > 0) {
    tempTextPng = import_node_path13.default.join(manifest.projectDir, `_text_overlay_${Date.now()}.png`);
    const specs = visibleTexts.map((l) => ({
      text: l.text ?? "",
      fontFamily: l.fontFamily || "PingFang SC",
      fontSize: l.fontSize ?? Math.max(28, Math.round(height * 0.044)),
      fillHex: l.fillColor || "#FFFFFF",
      strokeHex: l.strokeColor || "#000000",
      yOffset: l.yOffset,
      alignTop: manifest.alignTop
    }));
    const rendered = await renderTransparentTextOverlayPng(supportPath, width, totalHeight, specs, tempTextPng);
    if (!rendered) {
      tempTextPng = null;
    }
  }
  try {
    if (visibleBitmaps.length === 0 && !tempTextPng && barPad === 0) {
      import_node_fs12.default.copyFileSync(manifest.cleanPngPath, manifest.subbedPngPath);
    } else {
      const { compositeCapturePng: compositeCapturePng2 } = await Promise.resolve().then(() => (init_hdr_overlay(), hdr_overlay_exports));
      await compositeCapturePng2({
        ffmpegPath,
        env,
        backgroundPath: manifest.cleanPngPath,
        outputPath: manifest.subbedPngPath,
        width,
        height,
        barPad,
        isPq,
        colorPrimaries,
        colorTransfer,
        colorSpace,
        overlays: [
          ...visibleBitmaps.map((bmp) => ({
            path: import_node_path13.default.join(manifest.projectDir, bmp.bitmapFilename),
            y: videoY + (manifest.alignTop ? -Math.round(height * 0.72) : 0) + bmp.yOffset
          })),
          ...tempTextPng ? [{ path: tempTextPng, y: 0 }] : []
        ]
      });
    }
  } finally {
    if (tempTextPng) {
      import_node_fs12.default.rmSync(tempTextPng, { force: true });
    }
  }
  manifest.exportSignatures = exportSignatures({
    id: manifest.id,
    type: "screenshot",
    movieName: manifest.movieName,
    source: manifest.source,
    createdAt: manifest.createdAt,
    timestampLabel: manifest.timestampFormatted,
    cleanPngPath: manifest.cleanPngPath,
    subbedPngPath: manifest.subbedPngPath,
    layeredSvgPath: manifest.layeredSvgPath
  });
  const manifestFile = import_node_path13.default.join(manifest.projectDir, "manifest.json");
  let persisted = manifest;
  if (mergeIntoDisk) {
    try {
      const current = JSON.parse(import_node_fs12.default.readFileSync(manifestFile, "utf-8"));
      if (current.id === manifest.id) persisted = { ...current, exportSignatures: manifest.exportSignatures };
    } catch {
    }
  }
  import_node_fs12.default.writeFileSync(manifestFile, JSON.stringify(persisted, null, 2), "utf-8");
}
async function executeScreenshotTask(task, onStage) {
  const { config, probe, flags } = task;
  let discSource = isDiscSource(probe);
  if (!discSource) assertReadableVideoSource(probe);
  const env = buildExecutionEnv(config.bypassProxy);
  let budget = computeMediaBudget(probe);
  if (!probe.isRemote && !probe.sizeBytes) {
    try {
      const stat = import_node_fs12.default.statSync(probe.mediaTarget);
      if (stat.isFile() && stat.size > 0) budget = computeMediaBudget({ ...probe, sizeBytes: stat.size });
    } catch {
    }
  }
  const { projectsDir } = statePaths(config.supportPath);
  let targetSec = Math.max(0, probe.positionSec);
  let coarseSec = Math.max(0, targetSec - PREROLL_SECONDS);
  let endWindowSec = targetSec + POSTROLL_SECONDS;
  const projectDir = import_node_path13.default.join(projectsDir, task.id);
  import_node_fs12.default.mkdirSync(projectDir, { recursive: true });
  let workingMediaPath = probe.mediaTarget;
  let tempPrerollMkv = null;
  let usedPrerollCopy = false;
  let discLanguages = [];
  const cache = new SegmentCache(config.supportPath);
  const cacheKey = (disc) => segmentCacheKey({
    server: config.jellyfinUrl,
    source: probe.source,
    mediaSourceId: probe.mediaSourceId,
    itemId: probe.itemId,
    url: probe.mediaTarget,
    playlist: probe.playlist,
    disc
  });
  let segmentLease;
  let preparationLease;
  let rangeSource;
  let progressTimer;
  const cacheStats = { source: cacheKey(false), hits: 0, misses: 0, waited: false };
  try {
    if (probe.isRemote || discSource) {
      onStage?.("Waiting for another segment of the same video to finish preparing\u2026");
      preparationLease = await acquireSourceLease(config.supportPath, cacheKey(false));
      cacheStats.waited = preparationLease.waited;
      segmentLease = await cache.find(cacheKey(discSource), probe.positionSec);
      if (!segmentLease && probe.isRemote && !discSource)
        segmentLease = await cache.find(cacheKey(true), probe.positionSec);
    }
    if (preparationLease) {
      if (segmentLease) cacheStats.hits++;
      else cacheStats.misses++;
    }
    if (segmentLease) await preparationLease?.release();
    let windowResult;
    let headKind;
    if (probe.isRemote && !segmentLease && !discSource) {
      onStage?.("Analyzing remote video file structure\u2026");
      const writeProgress = (stats) => import_node_fs12.default.writeFileSync(
        import_node_path13.default.join(projectDir, "read-progress.json"),
        JSON.stringify({ bytes: stats.bytes, requests: stats.requests, updatedAt: Date.now() })
      );
      const session = await openRemoteWindow({
        url: probe.mediaTarget,
        targetPlayerSec: targetSec,
        prerollSec: PREROLL_SECONDS,
        postrollSec: WINDOW_POSTROLL_SECONDS,
        durationHintSec: probe.durationSec,
        workDir: projectDir,
        ffprobePath: config.ffprobePath,
        env,
        maxBytes: budget.maxRangeBytes,
        maxWindowBytes: MAX_SEGMENT_BYTES,
        onProgress: writeProgress,
        onStage
      });
      headKind = session.kind;
      try {
        if (session.kind === "disc") discSource = true;
        else if (session.kind === "ts" || session.kind === "mkv") {
          try {
            windowResult = await session.fetch();
          } catch (error) {
            if (!(error instanceof RemoteWindowUnsupported)) throw error;
            onStage?.(`Couldn't seek by index (${error.message}); reading with FFmpeg instead\u2026`);
          }
        }
      } finally {
        session.close();
        import_node_fs12.default.writeFileSync(import_node_path13.default.join(projectDir, "read-stats.json"), JSON.stringify(session.stats));
      }
    }
    rangeSource = probe.isRemote && !segmentLease && !windowResult ? await openRangeSource(probe.mediaTarget, probe) : void 0;
    const inputTarget = rangeSource?.url ?? probe.mediaTarget;
    workingMediaPath = inputTarget;
    progressTimer = rangeSource ? setInterval(() => {
      const stats = rangeSource.stats;
      import_node_fs12.default.writeFileSync(
        import_node_path13.default.join(projectDir, "read-progress.json"),
        JSON.stringify({ bytes: stats.bytes, requests: stats.requests, updatedAt: Date.now() })
      );
    }, 1e3) : void 0;
    if (rangeSource && !discSource && !headKind) {
      onStage?.("Analyzing video or disc file structure\u2026");
      discSource = await detectRemoteDisc(inputTarget);
    }
    if (segmentLease) {
      onStage?.("Reusing local video segment\u2026");
      discLanguages = segmentLease.subtitleLanguages || [];
      if (discLanguages.length) discSource = true;
      workingMediaPath = segmentLease.mediaPath;
      targetSec = segmentLease.targetSec;
      coarseSec = segmentLease.coarseSec;
      usedPrerollCopy = true;
    } else if (windowResult) {
      workingMediaPath = windowResult.mediaPath;
      tempPrerollMkv = windowResult.mediaPath;
      targetSec = windowResult.sourceTargetSec;
      usedPrerollCopy = true;
    } else if (discSource) {
      onStage?.("Locating the disc's main feature and the segment near the target (limited reads)\u2026");
      const disc = await prepareDiscSource(task, inputTarget, projectDir, () => {
        rangeSource?.markLocated();
        onStage?.("Target segment located; reading on demand (overall time limit lifted, you can stop manually)\u2026");
      });
      discLanguages = disc.subtitleLanguages;
      workingMediaPath = disc.mediaPath;
      tempPrerollMkv = disc.mediaPath;
      targetSec = disc.targetSec;
      coarseSec = disc.coarseSec;
      usedPrerollCopy = true;
    } else if (probe.isRemote) {
      onStage?.("Checking that the server returns a video file\u2026");
      await inspectMediaResponse(inputTarget);
      budget = computeMediaBudget(probe, rangeSource?.stats.totalBytes);
      const timing = await runCommand(
        config.ffprobePath,
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=start_time:format=start_time",
          "-of",
          "json",
          inputTarget
        ],
        { env, timeout: budget.probeTimeoutMs, maxBuffer: 1024 * 1024 }
      );
      const sourceStart = pickSourceStart(JSON.parse(timing.stdout));
      targetSec += sourceStart;
      endWindowSec = targetSec + POSTROLL_SECONDS;
      onStage?.("Downloading video near the target frame\u2026");
      const candidatePreroll = import_node_path13.default.join(projectDir, "_preroll.mkv");
      const videoPart = import_node_path13.default.join(projectDir, "_preroll_video.mkv");
      const subtitlePart = import_node_path13.default.join(projectDir, "_preroll_subs.mkv");
      tempPrerollMkv = candidatePreroll;
      const windowArgs = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        ...remoteInputFlags(true),
        "-ss",
        formatFfmpegTimestamp(coarseSec),
        "-copyts",
        "-i",
        inputTarget,
        "-to",
        formatFfmpegTimestamp(endWindowSec)
      ];
      try {
        try {
          await runCommand(
            config.ffmpegPath,
            [
              ...windowArgs,
              "-map",
              "0:v:0",
              "-c:v",
              "copy",
              "-avoid_negative_ts",
              "disabled",
              "-fs",
              String(MAX_SEGMENT_BYTES),
              videoPart
            ],
            { env, timeout: budget.prerollTimeoutMs }
          );
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("Step timed out after ")) throw error;
          throw new Error(
            `Couldn't read the source video; subtitle compositing didn't start.
${describeTaskError(error, task)}`
          );
        }
        if (!import_node_fs12.default.existsSync(videoPart) || import_node_fs12.default.statSync(videoPart).size <= 16384)
          throw new Error("The downloaded segment is empty or incomplete, so no frame could be captured.");
        rangeSource?.markLocated();
        let haveSubtitles = false;
        if (probe.subtitles.length > 0 || probe.source !== "jellyfin-remote") {
          onStage?.("Reading subtitles near the target frame\u2026");
          const codecs = probe.subtitles.some((sub) => sub.codec === "mov_text") ? ["srt"] : ["copy", "srt"];
          for (const codec of codecs) {
            try {
              await runCommand(
                config.ffmpegPath,
                [...windowArgs, "-map", "0:s", "-c:s", codec, "-avoid_negative_ts", "disabled", subtitlePart],
                { env, timeout: budget.prerollTimeoutMs }
              );
              haveSubtitles = import_node_fs12.default.existsSync(subtitlePart) && import_node_fs12.default.statSync(subtitlePart).size > 0;
              break;
            } catch (error) {
              import_node_fs12.default.rmSync(subtitlePart, { force: true });
              if (error instanceof Error && error.message === "Task stopped manually") throw error;
            }
          }
        }
        if (haveSubtitles) {
          await runCommand(
            config.ffmpegPath,
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-y",
              "-copyts",
              "-i",
              videoPart,
              "-i",
              subtitlePart,
              "-map",
              "0",
              "-map",
              "1",
              "-c",
              "copy",
              "-avoid_negative_ts",
              "disabled",
              candidatePreroll
            ],
            { env, timeout: budget.probeTimeoutMs }
          );
        } else {
          import_node_fs12.default.renameSync(videoPart, candidatePreroll);
        }
        workingMediaPath = candidatePreroll;
        usedPrerollCopy = true;
      } finally {
        import_node_fs12.default.rmSync(videoPart, { force: true });
        import_node_fs12.default.rmSync(subtitlePart, { force: true });
      }
    }
    if (!segmentLease && probe.isRemote && !discSource) {
      coarseSec += targetSec - probe.positionSec;
      if (!usedPrerollCopy)
        throw new Error("The downloaded segment is empty or incomplete, so no frame could be captured.");
    }
    if (!segmentLease && tempPrerollMkv) {
      segmentLease = await cache.store({
        key: cacheKey(discSource),
        mediaPath: tempPrerollMkv,
        titleTarget: probe.positionSec,
        sourceTarget: targetSec,
        ffprobePath: config.ffprobePath,
        env,
        subtitleLanguages: discLanguages,
        timeoutMs: budget.probeTimeoutMs
      });
      if (segmentLease) {
        workingMediaPath = segmentLease.mediaPath;
        tempPrerollMkv = null;
        coarseSec = segmentLease.coarseSec;
      } else if (import_node_fs12.default.statSync(tempPrerollMkv).size >= MAX_SEGMENT_BYTES) {
        throw new Error(
          "The target segment hit the local read limit (" + MAX_SEGMENT_BYTES / 1024 / 1024 + " MiB). Try a different capture point."
        );
      }
    }
    await preparationLease?.release();
    onStage?.(
      usedPrerollCopy ? "Reading frame and subtitle info from the local temp video\u2026" : "Reading frame and subtitle info from the original video (temp segment failed)\u2026"
    );
    const inspected = await inspectContainerMetadata(
      config.ffprobePath,
      workingMediaPath,
      config.bypassProxy,
      budget.probeTimeoutMs
    );
    const withDiscLanguages = (list) => list.map((sub) => {
      const lang = discLanguages.find((item) => item.pid === sub.pid)?.language;
      if (!lang) return sub;
      return { ...classifySubtitleStream(sub.index, sub.subOrdinal, sub.codec, lang, ""), pid: sub.pid };
    });
    const subtitles = discSource ? withDiscLanguages(inspected.subtitles) : mergeSubtitleStreams(inspected.subtitles, probe.subtitles);
    const { colorInfo } = inspected;
    const cleanTitle = sanitizeMovieTitle(probe.movieName);
    const timeTag = formatFileTimeTag(probe.positionSec);
    const baseName = getUniqueBaseName(config.saveDirectory, `${cleanTitle}_${timeTag}_${task.id.slice(0, 8)}`);
    const cleanPngPath = import_node_path13.default.join(config.saveDirectory, `${baseName}_clean.png`);
    const subbedPngPath = import_node_path13.default.join(config.saveDirectory, `${baseName}_subbed.png`);
    const layeredSvgPath = import_node_path13.default.join(config.saveDirectory, `${baseName}_layered.svg`);
    const frameSelection = await selectDisplayedFrame({
      ffprobePath: config.ffprobePath,
      mediaPath: workingMediaPath,
      requestedTitleSec: probe.positionSec,
      sourceTargetPTS: usedPrerollCopy ? targetSec : void 0,
      env,
      timeoutMs: budget.frameDecodeTimeoutMs
    });
    onStage?.(`Decoding frame-accurate 16-bit ${colorInfo.isHdr ? "HDR " : ""}master frame...`);
    const cleanInputArgs = usedPrerollCopy ? ["-copyts", "-i", workingMediaPath] : [
      ...remoteInputFlags(probe.isRemote),
      "-ss",
      formatFfmpegTimestamp(coarseSec),
      "-copyts",
      "-i",
      workingMediaPath
    ];
    const cleanResult = await runCommand(
      config.ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "info",
        "-y",
        ...cleanInputArgs,
        "-map",
        "0:v:0",
        "-an",
        "-sn",
        "-vf",
        `select=eq(pts\\,${frameSelection.selectedPtsTicks}),showinfo`,
        "-frames:v",
        "1",
        "-fps_mode",
        "passthrough",
        "-pix_fmt",
        "rgb48be",
        cleanPngPath
      ],
      { env, timeout: budget.frameDecodeTimeoutMs }
    );
    try {
      frameSelection.decodedPTS = verifyDecodedFrame(cleanResult.stderr, frameSelection);
    } catch (error) {
      import_node_fs12.default.rmSync(cleanPngPath, { force: true });
      throw error;
    }
    import_node_fs12.default.writeFileSync(
      import_node_path13.default.join(projectDir, "frame-selection.json"),
      JSON.stringify(
        {
          ...frameSelection,
          playbackObservation: probe.playbackObservation ?? null,
          requestedPlaylist: probe.playlist ?? null,
          sourceToTitleOffsetSec: frameSelection.sourceTargetPTS - probe.positionSec,
          usedPrerollCopy
        },
        null,
        2
      )
    );
    const cleanPng = import_node_fs12.default.existsSync(cleanPngPath) ? pngSize(cleanPngPath) : void 0;
    if (!cleanPng || cleanPng.width !== colorInfo.width || cleanPng.height !== colorInfo.height) {
      import_node_fs12.default.rmSync(cleanPngPath, { force: true });
      throw new Error(
        "The temp video doesn't cover the target frame, so no capture was made. Pause playback and try again. If it keeps happening, check that the player's reported position matches the actual video time."
      );
    }
    targetSec = frameSelection.selectedPTS;
    const manifest = {
      id: task.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      movieName: probe.movieName,
      timestampSec: probe.positionSec,
      timestampFormatted: formatHmsDisplay(probe.positionSec),
      source: probe.source,
      colorInfo,
      cinemaBar: flags.cinemaBar,
      alignTop: flags.alignTop,
      projectDir,
      cleanPngPath,
      subbedPngPath,
      layeredSvgPath,
      layers: [],
      composeState: subtitles.length > 0 ? "pending" : "done"
    };
    if (subtitles.length > 0) {
      const composeSource = await stageComposeSource(workingMediaPath, projectDir, probe);
      import_node_fs12.default.writeFileSync(
        import_node_path13.default.join(projectDir, "compose-context.json"),
        JSON.stringify({ mediaPath: composeSource, targetSec, coarseSec, usedPrerollCopy, subtitles }, null, 2)
      );
    }
    import_node_fs12.default.writeFileSync(import_node_path13.default.join(projectDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    return {
      id: task.id,
      type: "screenshot",
      movieName: probe.movieName,
      timestampLabel: formatHmsDisplay(probe.positionSec),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: probe.source,
      isHdr: colorInfo.isHdr,
      cleanPngPath,
      manifestPath: import_node_path13.default.join(projectDir, "manifest.json"),
      composeState: manifest.composeState
    };
  } catch (error) {
    if (rangeSource?.error()) throw new Error(rangeSource.error());
    throw error;
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    await preparationLease?.release();
    import_node_fs12.default.writeFileSync(import_node_path13.default.join(projectDir, "cache-stats.json"), JSON.stringify(cacheStats));
    await segmentLease?.release();
    if (rangeSource) {
      import_node_fs12.default.writeFileSync(import_node_path13.default.join(projectDir, "read-stats.json"), JSON.stringify(rangeSource.stats));
      await rangeSource.close();
    }
    if (tempPrerollMkv && import_node_fs12.default.existsSync(tempPrerollMkv)) {
      import_node_fs12.default.rmSync(tempPrerollMkv, { force: true });
    }
  }
}
async function stageComposeSource(workingMediaPath, projectDir, probe) {
  if (!probe.isRemote && workingMediaPath === probe.mediaTarget) return workingMediaPath;
  const target = import_node_path13.default.join(projectDir, `_compose-source${import_node_path13.default.extname(workingMediaPath) || ".mkv"}`);
  try {
    await import_node_fs12.default.promises.rm(target, { force: true });
    await import_node_fs12.default.promises.link(workingMediaPath, target);
    return target;
  } catch {
    try {
      await import_node_fs12.default.promises.copyFile(workingMediaPath, target);
      return target;
    } catch {
      return workingMediaPath;
    }
  }
}
async function executeComposeTask(task, onStage) {
  const { config, probe } = task;
  const env = buildExecutionEnv(config.bypassProxy);
  const budget = computeMediaBudget(probe);
  const projectDir = import_node_path13.default.join(statePaths(config.supportPath).projectsDir, task.parentId);
  const manifestPath = import_node_path13.default.join(projectDir, "manifest.json");
  const contextPath = import_node_path13.default.join(projectDir, "compose-context.json");
  const manifest = JSON.parse(import_node_fs12.default.readFileSync(manifestPath, "utf8"));
  const context = JSON.parse(import_node_fs12.default.readFileSync(contextPath, "utf8"));
  const { colorInfo } = manifest;
  const { mediaPath, coarseSec, usedPrerollCopy } = context;
  const targetSec = context.targetSec;
  const sourceInputArgs = usedPrerollCopy ? ["-copyts", "-i", mediaPath] : [...remoteInputFlags(probe.isRemote), "-ss", formatFfmpegTimestamp(coarseSec), "-copyts", "-i", mediaPath];
  const layers = [];
  const subtitleErrors = [];
  try {
    for (const sub of context.subtitles) {
      onStage?.(`Reading subtitle track [${sub.index}] ${sub.title}\u2026`);
      const layerId = `Subtitle-Track-${sub.index}-${sub.language}`;
      if (sub.isBitmap) {
        const bitmapFilename = `track_${sub.index}_${sub.language}.png`;
        const bitmapFullPath = import_node_path13.default.join(projectDir, bitmapFilename);
        try {
          let canvas = { width: colorInfo.width, height: colorInfo.height };
          let bitmapInputArgs = sourceInputArgs;
          let bitmapOrdinal = sub.subOrdinal;
          if (sub.codec === "hdmv_pgs_subtitle" || sub.codec === "pgssub") {
            const supPath = import_node_path13.default.join(projectDir, `track_${sub.index}.sup`);
            try {
              await runCommand(
                config.ffmpegPath,
                [
                  "-v",
                  "error",
                  "-y",
                  ...sourceInputArgs,
                  "-map",
                  `0:s:${sub.subOrdinal}`,
                  "-c:s",
                  "copy",
                  "-f",
                  "sup",
                  supPath
                ],
                { env, timeout: budget.subtitleExtractTimeoutMs }
              );
              const supBytes = import_node_fs12.default.existsSync(supPath) ? import_node_fs12.default.statSync(supPath).size : 0;
              if (supBytes === 0) {
                layers.push({
                  id: layerId,
                  index: sub.index,
                  subOrdinal: sub.subOrdinal,
                  language: sub.language,
                  title: sub.title,
                  codec: sub.codec,
                  kind: "bitmap",
                  visible: false,
                  yOffset: 0,
                  isChinese: sub.isChinese,
                  isEnglish: sub.isEnglish,
                  hasActiveContent: false,
                  isEmptyTrack: true
                });
                continue;
              }
              canvas = readPgsCanvas(supPath) || canvas;
              bitmapInputArgs = ["-copyts", "-i", supPath];
              bitmapOrdinal = 0;
            } catch (error) {
              import_node_fs12.default.rmSync(supPath, { force: true });
              throw error;
            }
          }
          await runCommand(
            config.ffmpegPath,
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-y",
              ...bitmapInputArgs,
              "-f",
              "lavfi",
              "-i",
              `color=c=black@0.0:s=${canvas.width}x${canvas.height}:r=24:d=${(targetSec - coarseSec + 1).toFixed(3)},format=rgba`,
              "-filter_complex",
              `[1:v]setpts=PTS+${coarseSec.toFixed(3)}/TB[bg];[bg][0:s:${bitmapOrdinal}]overlay=eof_action=pass:shortest=0:format=auto,select=gte(t\\,${targetSec.toFixed(6)}),scale=${colorInfo.width}:${colorInfo.height}[out]`,
              "-map",
              "[out]",
              "-frames:v",
              "1",
              "-fps_mode",
              "passthrough",
              bitmapFullPath
            ],
            { env, timeout: budget.subtitleExtractTimeoutMs }
          );
          if (import_node_fs12.default.existsSync(bitmapFullPath)) {
            const stat = import_node_fs12.default.statSync(bitmapFullPath);
            const hasActive = await hasVisibleAlphaPixels(config.ffmpegPath, bitmapFullPath, env);
            layers.push({
              id: layerId,
              index: sub.index,
              subOrdinal: sub.subOrdinal,
              language: sub.language,
              title: sub.title,
              codec: sub.codec,
              kind: "bitmap",
              visible: false,
              yOffset: 0,
              isChinese: sub.isChinese,
              isEnglish: sub.isEnglish,
              bitmapFilename,
              bitmapBytes: stat.size,
              hasActiveContent: hasActive
            });
          }
        } catch {
          subtitleErrors.push(sub.index);
        } finally {
          import_node_fs12.default.rmSync(import_node_path13.default.join(projectDir, `track_${sub.index}.sup`), { force: true });
        }
      } else {
        const textWinStart = Math.max(0, targetSec - 25);
        const textInputArgs = usedPrerollCopy ? ["-copyts", "-i", mediaPath] : [
          ...remoteInputFlags(probe.isRemote),
          "-ss",
          formatFfmpegTimestamp(textWinStart),
          "-copyts",
          "-i",
          mediaPath,
          "-to",
          formatFfmpegTimestamp(targetSec + 3)
        ];
        try {
          const { stdout } = await runCommand(
            config.ffmpegPath,
            ["-hide_banner", "-loglevel", "error", ...textInputArgs, "-map", `0:s:${sub.subOrdinal}`, "-f", "srt", "-"],
            { env, timeout: budget.subtitleExtractTimeoutMs, maxBuffer: 4 * 1024 * 1024 }
          );
          const matchedText = findActiveSubtitleText(stdout, targetSec);
          layers.push({
            id: layerId,
            index: sub.index,
            subOrdinal: sub.subOrdinal,
            language: sub.language,
            title: sub.title,
            codec: sub.codec,
            kind: "text",
            visible: false,
            yOffset: 0,
            isChinese: sub.isChinese,
            isEnglish: sub.isEnglish,
            hasActiveContent: matchedText.length > 0,
            isEmptyTrack: stdout.trim().length === 0,
            text: matchedText,
            fontFamily: "PingFang SC",
            fontSize: Math.max(28, Math.round(colorInfo.height * 0.044)),
            fillColor: "#FFFFFF",
            strokeColor: "#000000"
          });
        } catch {
          subtitleErrors.push(sub.index);
        }
      }
    }
    import_node_fs12.default.writeFileSync(
      import_node_path13.default.join(projectDir, "subtitle-status.json"),
      JSON.stringify({
        failedTracks: subtitleErrors,
        activeTracks: layers.filter((l) => l.hasActiveContent).map((l) => l.index),
        sourceTargetSec: targetSec
      })
    );
    manifest.layers = layers;
    applyInitialLayerSelection(layers, task.flags.mode, colorInfo.height);
    const hasSubtitles = layers.some((layer) => layer.hasActiveContent);
    onStage?.(hasSubtitles ? "Compositing subtitled frame and layered SVG\u2026" : "Preparing subtitle layers\u2026");
    if (hasSubtitles) {
      await recomposeCaptureOutputs(manifest, config.supportPath, config.ffmpegPath, config.bypassProxy);
    } else {
      import_node_fs12.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
    manifest.composeState = "done";
    if (subtitleErrors.length) {
      manifest.composeError = `Couldn't read subtitle track(s) ${subtitleErrors.join(", ")}; composited with the remaining tracks.`;
    } else {
      delete manifest.composeError;
    }
    import_node_fs12.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    import_node_fs12.default.rmSync(contextPath, { force: true });
    return {
      id: task.parentId,
      type: "screenshot",
      movieName: probe.movieName,
      timestampLabel: formatHmsDisplay(probe.positionSec),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: probe.source,
      cleanPngPath: manifest.cleanPngPath,
      subbedPngPath: hasSubtitles ? manifest.subbedPngPath : void 0,
      layeredSvgPath: hasSubtitles ? manifest.layeredSvgPath : void 0,
      manifestPath,
      trackCount: layers.length,
      composeState: "done",
      composeError: manifest.composeError
    };
  } finally {
    if (mediaPath.startsWith(projectDir) && import_node_path13.default.basename(mediaPath).startsWith("_compose-source")) {
      import_node_fs12.default.rmSync(mediaPath, { force: true });
    }
  }
}
async function executeClipTask(task, onStage) {
  const { config, probe, startSec, durationSec, burnSubtitles } = task;
  assertReadableVideoSource(probe);
  const env = buildExecutionEnv(config.bypassProxy);
  const clipBudget = computeMediaBudget(probe);
  const clipTimeoutMs = Math.max(6e5, Math.round(durationSec * 2e4) + 12e4);
  const burnTimeoutMs = Math.max(6e5, Math.round(durationSec * 6e4) + clipBudget.prerollTimeoutMs);
  const cleanTitle = sanitizeMovieTitle(probe.movieName);
  const timeTag = `${formatFileTimeTag(startSec)}_${Math.round(durationSec)}s`;
  const baseName = getUniqueBaseName(config.saveDirectory, `${cleanTitle}_${timeTag}_${task.id.slice(0, 8)}`);
  const outMkvPath = import_node_path13.default.join(config.saveDirectory, `${baseName}.mkv`);
  let subtitles = probe.subtitles;
  let width = 1920;
  let height = 1080;
  if (subtitles.length === 0 || burnSubtitles) {
    try {
      const inspected = await inspectContainerMetadata(config.ffprobePath, probe.mediaTarget, config.bypassProxy);
      subtitles = mergeSubtitleStreams(inspected.subtitles, probe.subtitles);
      width = inspected.colorInfo.width;
      height = inspected.colorInfo.height;
    } catch {
    }
  }
  const bestChi = subtitles.find((s) => s.isChinese) ?? subtitles[0];
  if (burnSubtitles) {
    onStage?.("Encoding frame-accurate HEVC clip via Apple VideoToolbox...");
    const prerollStart = Math.max(0, startSec - 6);
    const fineOffset = startSec - prerollStart;
    const filterArgs = [];
    const mapArgs = [];
    if (bestChi && bestChi.isBitmap) {
      filterArgs.push("-filter_complex", `[0:v][0:s:${bestChi.subOrdinal}]overlay=eof_action=pass[vout]`);
      mapArgs.push("-map", "[vout]", "-map", "0:a?");
    } else {
      mapArgs.push("-map", "0:v:0", "-map", "0:a?", "-map", "0:s?");
    }
    const burnArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...remoteInputFlags(probe.isRemote),
      "-ss",
      formatFfmpegTimestamp(prerollStart),
      "-i",
      probe.mediaTarget,
      "-ss",
      formatFfmpegTimestamp(fineOffset),
      "-t",
      durationSec.toFixed(3),
      ...filterArgs,
      ...mapArgs,
      "-c:v",
      "hevc_videotoolbox",
      "-q:v",
      "68",
      "-tag:v",
      "hvc1",
      "-c:a",
      "copy",
      ...bestChi && !bestChi.isBitmap ? ["-c:s", "copy"] : [],
      outMkvPath
    ];
    void width;
    void height;
    await runCommand(config.ffmpegPath, burnArgs, { env, timeout: burnTimeoutMs });
  } else {
    onStage?.("Stream-copying lossless multi-track MKV clip...");
    const dispArgs = ["-disposition:s", "0"];
    if (bestChi) {
      dispArgs.push(`-disposition:s:${bestChi.subOrdinal}`, "default");
    }
    const needsSubtitleConversion = subtitles.some((s) => s.codec === "mov_text");
    const subtitleCodec = needsSubtitleConversion ? "srt" : "copy";
    const copyArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...remoteInputFlags(probe.isRemote),
      "-probesize",
      "15M",
      "-analyzeduration",
      "15M",
      "-ss",
      formatFfmpegTimestamp(startSec),
      "-i",
      probe.mediaTarget,
      "-t",
      durationSec.toFixed(3),
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-map",
      "0:s?",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-c:s",
      subtitleCodec,
      "-avoid_negative_ts",
      "make_zero",
      ...dispArgs,
      outMkvPath
    ];
    try {
      await runCommand(config.ffmpegPath, copyArgs, { env, timeout: clipTimeoutMs });
    } catch (error) {
      if (subtitleCodec === "srt") throw error;
      const fallbackArgs = copyArgs.map((arg, idx) => arg === "copy" && copyArgs[idx - 1] === "-c:s" ? "srt" : arg);
      await runCommand(config.ffmpegPath, fallbackArgs, { env, timeout: clipTimeoutMs });
    }
  }
  if (!import_node_fs12.default.existsSync(outMkvPath)) {
    throw new Error("Clip output was not created.");
  }
  const stat = import_node_fs12.default.statSync(outMkvPath);
  if (stat.size === 0) {
    import_node_fs12.default.rmSync(outMkvPath, { force: true });
    throw new Error("Clip output is empty; the source did not yield any decodable stream.");
  }
  try {
    const probe2 = await runCommand(
      config.ffprobePath,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", outMkvPath],
      { env, timeout: 3e4, maxBuffer: 1024 * 1024 }
    );
    if (probe2.stdout.trim() !== "video") throw new Error("no video stream");
  } catch {
    import_node_fs12.default.rmSync(outMkvPath, { force: true });
    throw new Error(`Clip output (${stat.size} bytes) has no playable video stream and was discarded.`);
  }
  return {
    id: task.id,
    type: "clip",
    movieName: probe.movieName,
    timestampLabel: `${formatHmsDisplay(startSec)} (+${durationSec.toFixed(1)}s)`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: probe.source,
    clipMkvPath: outMkvPath,
    sizeMb: Math.round(stat.size / (1024 * 1024) * 10) / 10,
    trackCount: subtitles.length
  };
}

// src/worker/task-process.ts
function activeTaskFile(supportPath, id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid task ID");
  return import_node_path14.default.join(supportPath, "active-tasks", `${id}.json`);
}
function failureLabel(task) {
  const hms = (sec) => {
    const safe = Math.max(0, sec);
    const h = Math.floor(safe / 3600);
    const m = Math.floor(safe % 3600 / 60);
    const s = Math.floor(safe % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  if (task.type === "clip") {
    return `Clip ${hms(task.startSec)} \u2192 ${hms(task.endSec)} (${task.durationSec.toFixed(1)}s)`;
  }
  if (task.type === "compose") {
    return `Subtitle composite @ ${hms(task.probe.positionSec)}`;
  }
  return `Frame @ ${hms(task.probe.positionSec)}`;
}
function recordFailure(supportPath, state, message, notify = true) {
  transaction(supportPath, () => {
    const file = activeTaskFile(supportPath, state.task.id);
    const latest = readJson(file, null);
    if (latest?.failureRecorded) return;
    const task = state.task;
    const dir = import_node_path14.default.join(statePaths(supportPath).projectsDir, task.id);
    import_node_fs13.default.mkdirSync(dir, { recursive: true, mode: 448 });
    writeJson(import_node_path14.default.join(dir, "retry.json"), task);
    appendHistory(supportPath, {
      captureRequestId: task.type === "screenshot" ? task.captureRequestId || task.id : task.id,
      playlist: task.probe.playlist,
      id: task.id,
      type: task.type,
      status: "failed",
      errorMessage: message,
      movieName: task.probe.movieName,
      source: task.probe.source,
      taskKind: task.type,
      failureLabel: failureLabel(task),
      timestampLabel: failureLabel(task),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    state.failureRecorded = true;
    state.stage = message;
    state.failureNotified = notify && task.type === "screenshot";
    writeJson(file, state);
    if (state.failureNotified) {
      const count = readHistory(supportPath).filter(
        (item) => item.type === "screenshot" && item.status === "failed"
      ).length;
      postMacNotification(
        "FrameCraft \xB7 Capture failed",
        `"${task.probe.movieName}" \xB7 ${count} failed \xB7 ${readQueue(supportPath).length} still queued`
      );
    }
  });
}
async function runTaskProcess(jobFile, supportPath) {
  let state = transaction(supportPath, () => {
    const job = readJson(jobFile, null);
    if (!job || jobFile !== activeTaskFile(supportPath, job.task.id)) return null;
    if (job.phase === "reserved") {
      job.pid = process.pid;
      job.phase = "running";
      writeJson(jobFile, job);
    }
    return job.pid === process.pid ? job : null;
  });
  if (!state) return;
  const currentTask = state.task;
  const cancelFile = import_node_path14.default.join(supportPath, `cancel-${currentTask.id}.json`);
  const stoppingFile = import_node_path14.default.join(supportPath, `stopping-${currentTask.id}.json`);
  let stopping = false;
  let lastStage = "Starting";
  const update = (stage) => transaction(supportPath, () => {
    state = { ...state, phase: "running", stage };
    writeJson(jobFile, state);
  });
  update("Starting task...");
  const checkCancellation = () => {
    if (stopping) return true;
    try {
      import_node_fs13.default.renameSync(cancelFile, stoppingFile);
    } catch {
      return false;
    }
    stopping = true;
    update("Stopping current task\u2026");
    return true;
  };
  setCancellationCheck(checkCancellation);
  const reportStage = (stage) => {
    if (checkCancellation()) throw new Error("Task stopped manually");
    lastStage = stage;
    update(stage);
  };
  try {
    const entry = currentTask.type === "screenshot" ? await executeScreenshotTask(currentTask, reportStage) : currentTask.type === "clip" ? await executeClipTask(currentTask, reportStage) : await executeComposeTask(currentTask, reportStage);
    if (checkCancellation()) throw new Error("Task stopped manually");
    transaction(supportPath, () => {
      entry.captureRequestId = currentTask.type === "clip" ? currentTask.id : currentTask.type === "compose" ? currentTask.parentId : currentTask.captureRequestId || currentTask.id;
      entry.playlist = currentTask.probe.playlist;
      if (currentTask.type === "compose") {
        updateHistoryEntry(supportPath, entry);
      } else {
        appendHistory(supportPath, entry);
      }
      if (currentTask.type === "screenshot" && entry.composeState === "pending") {
        enqueueTask(supportPath, {
          id: (0, import_node_crypto4.randomUUID)(),
          type: "compose",
          createdAt: Date.now(),
          probe: currentTask.probe,
          flags: currentTask.flags,
          config: currentTask.config,
          parentId: currentTask.id
        });
      }
      state = { ...state, phase: "finished", stage: "Completed" };
      writeJson(jobFile, state);
    });
    if (currentTask.type === "screenshot" && currentTask.config.copyToClipboard && (entry.subbedPngPath || entry.cleanPngPath)) {
      try {
        await copyPngToClipboard(supportPath, entry.subbedPngPath || entry.cleanPngPath);
      } catch {
      }
    }
  } catch (error) {
    const candidateFile = import_node_path14.default.join(statePaths(supportPath).projectsDir, currentTask.id, "playlists.json");
    if (!stopping && error instanceof DiscPlaylistCandidatesError && currentTask.type === "screenshot" && currentTask.probe.playlist === void 0 && import_node_fs13.default.existsSync(candidateFile)) {
      const rawCandidates = readJson(candidateFile, []);
      const seen = /* @__PURE__ */ new Set();
      const candidates = rawCandidates.filter((candidate) => {
        const signature2 = candidate.segments?.length ? JSON.stringify([candidate.durationSec, candidate.segments]) : `playlist:${candidate.playlist}`;
        if (seen.has(signature2)) return false;
        seen.add(signature2);
        return true;
      });
      if (candidates.length > 0 && candidates.length <= 3) {
        transaction(supportPath, () => {
          for (const candidate of candidates) {
            const task = structuredClone(currentTask);
            task.id = (0, import_node_crypto4.randomUUID)();
            task.captureRequestId = currentTask.captureRequestId || currentTask.id;
            task.probe.playlist = candidate.playlist;
            task.probe.movieName = `${currentTask.probe.movieName} \xB7 Version ${candidate.playlist}`;
            enqueueTask(supportPath, task);
          }
          deleteHistoryEntry(supportPath, currentTask.id);
        });
        return;
      }
    }
    recordFailure(supportPath, state, `Failed at: ${lastStage}
${describeTaskError(error, currentTask)}`, !stopping);
  } finally {
    setCancellationCheck(void 0);
    transaction(supportPath, () => {
      import_node_fs13.default.rmSync(cancelFile, { force: true });
      import_node_fs13.default.rmSync(stoppingFile, { force: true });
      import_node_fs13.default.rmSync(jobFile, { force: true });
    });
  }
}

// src/lib/studio-export.ts
var import_node_fs14 = __toESM(require("node:fs"));
var import_node_path15 = __toESM(require("node:path"));
function files(manifestPath) {
  const dir = import_node_path15.default.dirname(manifestPath);
  return { lock: import_node_path15.default.join(dir, ".studio-export.lock"), again: import_node_path15.default.join(dir, ".studio-export.again") };
}
function alive3(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
function read(manifestPath) {
  try {
    return JSON.parse(import_node_fs14.default.readFileSync(manifestPath, "utf-8"));
  } catch {
    return null;
  }
}
function isStudioExportRunning(manifestPath) {
  try {
    return alive3(Number(import_node_fs14.default.readFileSync(files(manifestPath).lock, "utf-8")));
  } catch {
    return false;
  }
}
async function runStudioExport(manifestPath, options) {
  const { lock, again } = files(manifestPath);
  try {
    import_node_fs14.default.writeFileSync(lock, String(process.pid), { flag: "wx" });
  } catch {
    if (isStudioExportRunning(manifestPath)) return;
    import_node_fs14.default.writeFileSync(lock, String(process.pid));
  }
  let exported = false;
  try {
    while (import_node_fs14.default.existsSync(again)) {
      import_node_fs14.default.rmSync(again, { force: true });
      const manifest = read(manifestPath);
      if (!manifest?.studioDirty) continue;
      const snapshot = JSON.stringify(manifest.layers);
      try {
        await recomposeCaptureOutputs(
          structuredClone(manifest),
          options.supportPath,
          options.ffmpegPath,
          options.bypassProxy,
          true
        );
        exported = true;
        const latest = read(manifestPath);
        if (latest && !import_node_fs14.default.existsSync(again) && JSON.stringify(latest.layers) === snapshot) {
          latest.studioDirty = false;
          delete latest.studioExportError;
          import_node_fs14.default.writeFileSync(manifestPath, JSON.stringify(latest, null, 2), "utf-8");
        }
      } catch (error) {
        const latest = read(manifestPath);
        if (latest) {
          latest.studioExportError = error instanceof Error ? error.message : String(error);
          import_node_fs14.default.writeFileSync(manifestPath, JSON.stringify(latest, null, 2), "utf-8");
        }
      }
    }
    const final = read(manifestPath);
    if (exported && options.copyToClipboard && final && !final.studioDirty) {
      await copyPngToClipboard(options.supportPath, final.subbedPngPath).catch(() => void 0);
    }
  } finally {
    try {
      if (import_node_fs14.default.readFileSync(lock, "utf-8") === String(process.pid)) import_node_fs14.default.rmSync(lock, { force: true });
    } catch {
    }
  }
  if (import_node_fs14.default.existsSync(again) && read(manifestPath)?.studioDirty) await runStudioExport(manifestPath, options);
}

// src/worker/worker-entry.ts
var SCREENSHOT_CONCURRENCY = Math.max(3, Math.min(8, Math.floor((import_node_os.default.cpus().length || 4) * 0.75)));
var COMPOSE_CONCURRENCY = Math.max(2, Math.min(4, Math.floor((import_node_os.default.cpus().length || 4) / 2)));
var CLIP_CONCURRENCY = 1;
function lockPid(file) {
  try {
    return Number.parseInt(import_node_fs15.default.readFileSync(file, "utf8"), 10);
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
function writeOwner(file) {
  const tmp = `${file}.${process.pid}.tmp`;
  import_node_fs15.default.writeFileSync(tmp, String(process.pid), { mode: 384 });
  import_node_fs15.default.renameSync(tmp, file);
}
async function runDispatcher(supportPath) {
  supportPath = import_node_path16.default.resolve(supportPath);
  const { lockFile, activeFile } = statePaths(supportPath);
  const activeDir = import_node_path16.default.join(supportPath, "active-tasks");
  let ownsLock = false;
  try {
    for (; ; ) {
      const outcome = transaction(supportPath, () => {
        const owner = lockPid(lockFile);
        if (owner !== process.pid && alive2(owner)) return "wait";
        const liveLegacy = readJson(activeFile, null);
        if (liveLegacy && alive2(liveLegacy.pid)) return "wait";
        if (owner !== process.pid) {
          writeOwner(lockFile);
          ownsLock = true;
        }
        import_node_fs15.default.mkdirSync(activeDir, { recursive: true, mode: 448 });
        const queue = readQueue(supportPath);
        const states = [];
        for (const name of import_node_fs15.default.readdirSync(activeDir).filter((name2) => name2.endsWith(".json"))) {
          const file = import_node_path16.default.join(activeDir, name);
          const state = readJson(file, null);
          if (!state) continue;
          if (state.phase === "reserved") {
            states.push(state);
          } else if (taskGroupAlive(state.pid)) {
            states.push(state);
          } else {
            const result = readHistory(supportPath).find((entry) => entry.id === state.task.id);
            if (!result && state.phase !== "finished")
              recordFailure(
                supportPath,
                state,
                "The background task process exited unexpectedly. The task was kept so you can retry it.",
                !import_node_fs15.default.existsSync(import_node_path16.default.join(supportPath, `stopping-${state.task.id}.json`))
              );
            import_node_fs15.default.rmSync(file, { force: true });
            import_node_fs15.default.rmSync(import_node_path16.default.join(supportPath, `cancel-${state.task.id}.json`), { force: true });
            import_node_fs15.default.rmSync(import_node_path16.default.join(supportPath, `stopping-${state.task.id}.json`), { force: true });
          }
        }
        const legacy = readJson(activeFile, null);
        if (legacy && !alive2(legacy.pid)) {
          if (!readHistory(supportPath).some((entry) => entry.id === legacy.task.id)) {
            recordFailure(supportPath, legacy, "A previous background task process exited. Try again.");
            import_node_fs15.default.rmSync(activeTaskFile(supportPath, legacy.task.id), { force: true });
          }
          import_node_fs15.default.rmSync(activeFile, { force: true });
        }
        const reservedIds = new Set(states.map((state) => state.task.id));
        let pending = queue.filter((task) => !reservedIds.has(task.id));
        while (states.length < SCREENSHOT_CONCURRENCY + COMPOSE_CONCURRENCY + CLIP_CONCURRENCY) {
          const shots = states.filter((state2) => state2.task.type === "screenshot").length;
          const composes = states.filter((state2) => state2.task.type === "compose").length;
          const hasClip = states.some((state2) => state2.task.type === "clip");
          const index = pending.findIndex(
            (task2) => task2.type === "screenshot" ? shots < SCREENSHOT_CONCURRENCY : task2.type === "compose" ? composes < COMPOSE_CONCURRENCY : !hasClip
          );
          if (index < 0) break;
          const task = pending[index];
          const state = {
            pid: process.pid,
            startedAt: Date.now(),
            stage: "Waiting to start task process\u2026",
            task,
            phase: "reserved"
          };
          writeJson(activeTaskFile(supportPath, task.id), state);
          states.push(state);
          pending = pending.filter((item) => item.id !== task.id);
        }
        saveQueue(supportPath, pending);
        for (const state of states.filter((state2) => state2.phase === "reserved")) {
          const file = activeTaskFile(supportPath, state.task.id);
          const child = (0, import_node_child_process5.spawn)(process.execPath, [process.argv[1], "--task", file, supportPath], {
            detached: true,
            stdio: "ignore"
          });
          child.once("error", () => {
          });
          if (!child.pid) {
            recordFailure(supportPath, state, "Couldn't start the task subprocess. Try again.");
            import_node_fs15.default.rmSync(file, { force: true });
            continue;
          }
          state.pid = child.pid;
          state.phase = "running";
          writeJson(file, state);
          child.unref();
        }
        if (states.length === 0 && pending.length === 0) {
          if (lockPid(lockFile) === process.pid) import_node_fs15.default.rmSync(lockFile, { force: true });
          ownsLock = false;
          return "done";
        }
        return "wait";
      });
      if (outcome === "done") {
        try {
          await clearTemporaryStorage(supportPath, true);
        } catch {
        }
        const child = (0, import_node_child_process5.spawn)(process.execPath, [process.argv[1], "--cleanup", supportPath], {
          detached: true,
          stdio: "ignore"
        });
        child.on("error", () => void 0);
        child.unref();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } finally {
    if (ownsLock)
      transaction(supportPath, () => {
        if (lockPid(lockFile) === process.pid) import_node_fs15.default.rmSync(lockFile, { force: true });
      });
  }
}
var args = process.argv.slice(2);
async function delayedCleanup(supportPath) {
  await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1e3 + 1e3));
  await clearTemporaryStorage(supportPath, true);
}
var work = args[0] === "--cleanup" && args[1] ? delayedCleanup(import_node_path16.default.resolve(args[1])) : args[0] === "--export" && args[1] && args[2] ? runStudioExport(import_node_path16.default.resolve(args[1]), JSON.parse(args[2])) : args[0] === "--task" && args[1] && args[2] ? runTaskProcess(import_node_path16.default.resolve(args[1]), import_node_path16.default.resolve(args[2])) : args[0] ? runDispatcher(args[0]) : Promise.resolve();
work.catch(() => {
  process.exitCode = 1;
});
