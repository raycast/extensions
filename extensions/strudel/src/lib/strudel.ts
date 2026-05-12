import { environment } from "@raycast/api";
import { spawn, ChildProcess } from "node:child_process";
import { promises as fs, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import * as strudelCore from "@strudel/core";
import * as strudelMini from "@strudel/mini";
import * as strudelTranspiler from "@strudel/transpiler";
import * as superdough from "superdough";

const nodeRequire = createRequire(__filename);

// Set strudel functions on globalThis at import time so evaluate() can resolve s(), n(), etc.
// Function(body)() runs in the real global scope — these must be present before any evaluate call.
try {
  const g = globalThis as Record<string, unknown>;
  g.window ??= g;
  g.self ??= g;
  Object.assign(g, strudelCore);
  Object.assign(g, strudelMini);
} catch {
  /* ignore */
}
let nodeWebAudioApi: typeof import("node-web-audio-api") | null = null;
type AudioContextInstance = InstanceType<typeof import("node-web-audio-api").AudioContext>;

function getNodeWebAudioApi() {
  if (nodeWebAudioApi) return nodeWebAudioApi;
  try {
    nodeWebAudioApi = nodeRequire("node-web-audio-api") as typeof import("node-web-audio-api");
    return nodeWebAudioApi;
  } catch {
    const vendoredEntry = path.join(environment.assetsPath, "node-web-audio-api", "index.cjs");
    nodeWebAudioApi = nodeRequire(vendoredEntry) as typeof import("node-web-audio-api");
    return nodeWebAudioApi;
  }
}

const WORKLET_GLOBALS = [
  "AudioContext",
  "OfflineAudioContext",
  "AudioNode",
  "AudioScheduledSourceNode",
  "AudioBuffer",
  "AudioBufferSourceNode",
  "AudioParam",
  "AudioWorkletNode",
  "GainNode",
  "ChannelMergerNode",
  "ChannelSplitterNode",
  "StereoPannerNode",
  "DelayNode",
  "BiquadFilterNode",
  "ConvolverNode",
  "DynamicsCompressorNode",
  "WaveShaperNode",
  "ConstantSourceNode",
  "AnalyserNode",
  "OscillatorNode",
  "BaseAudioContext",
] as const;

let fallbackAliasesRegistered = false;
let sourceNodeLifecyclePatched = false;

function ensureBrowserShims() {
  const g = globalThis as Record<string, unknown>;
  // Re-assign every call — long-running session can lose these globals (GC of weak refs,
  // or libs reassigning). Strudel re-checks `window` lazily and prints "cannot use window:
  // not in browser?" if missing, then renders silently fail.
  g.window = g;
  g.self ??= g;
  g.globalThis ??= g;
  g.document = g.document ?? {
    createElement: () => ({ click: () => {}, appendChild: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  g.addEventListener ??= () => {};
  g.removeEventListener ??= () => {};
  g.CustomEvent ??= class CustomEvent {
    constructor() {}
  };
}

function ensureWebAudioGlobals() {
  const audioApi = getNodeWebAudioApi();
  const g = globalThis as Record<string, unknown>;
  for (const key of WORKLET_GLOBALS) {
    const value = audioApi[key];
    if (value && !(key in g)) g[key] = value;
  }
  g.btoa ??= (input: string) => Buffer.from(input, "binary").toString("base64");
  g.atob ??= (input: string) => Buffer.from(input, "base64").toString("binary");
}

function patchSourceNodeLifecycleGuards() {
  if (sourceNodeLifecyclePatched) return;
  const ctor = (globalThis as Record<string, unknown>).AudioScheduledSourceNode as
    | (new (...args: unknown[]) => { start: (...args: unknown[]) => void; stop: (...args: unknown[]) => void })
    | undefined;
  if (!ctor?.prototype) return;

  const originalStart = ctor.prototype.start;
  const originalStop = ctor.prototype.stop;

  ctor.prototype.start = function patchedStart(...args: unknown[]) {
    try {
      return originalStart.apply(this, args);
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidStateError") return;
      throw error;
    }
  };
  ctor.prototype.stop = function patchedStop(...args: unknown[]) {
    try {
      return originalStop.apply(this, args);
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidStateError") return;
      throw error;
    }
  };
  sourceNodeLifecyclePatched = true;
}

const workletTmpFileCache = new Map<string, string>();
async function patchWorkletAddModule(audioContext: AudioContextInstance) {
  const worklet = audioContext.audioWorklet as {
    addModule: (url: string) => Promise<void>;
    __strudelPatched?: boolean;
  };
  if (worklet.__strudelPatched) return;
  const originalAddModule = worklet.addModule.bind(worklet);
  worklet.addModule = async (url: string) => {
    if (url.startsWith("data:")) {
      const match = /^data:[^;]*;base64,(.*)$/.exec(url);
      if (!match) throw new Error("Unsupported worklet data URL");
      // Dedupe by base64 payload so repeated renders reuse the same tmpfile path.
      // Some native impls of audioWorklet.addModule cache by URL — feeding a fresh
      // tmpfile each render appears to stall startRendering on subsequent passes.
      const key = match[1];
      let tempPath = workletTmpFileCache.get(key);
      if (!tempPath) {
        const decoded = Buffer.from(key, "base64").toString("utf8");
        tempPath = path.join(os.tmpdir(), `strudel-worklet-${key.slice(0, 16)}.js`);
        await fs.writeFile(tempPath, decoded, "utf8");
        workletTmpFileCache.set(key, tempPath);
      }
      return originalAddModule(tempPath);
    }
    return originalAddModule(url);
  };
  worklet.__strudelPatched = true;
}

function registerFallbackSampleAliases() {
  if (fallbackAliasesRegistered) return;
  const aliases: Array<[string, string]> = [
    ["bd", "z_sine"],
    ["sn", "z_noise"],
    ["sd", "z_noise"],
    ["hh", "z_tan"],
    ["cp", "z_square"],
    ["oh", "z_triangle"],
  ];
  for (const [alias, source] of aliases) {
    superdough.soundAlias(source, alias);
  }
  fallbackAliasesRegistered = true;
}

const SAMPLE_PACKS = ["github:tidalcycles/dirt-samples"];
let samplesLoading: Promise<void> | null = null;

function ensureSamplesLoaded(): Promise<void> {
  if (samplesLoading) return samplesLoading;
  samplesLoading = (async () => {
    for (const pack of SAMPLE_PACKS) {
      try {
        await superdough.samples(pack);
      } catch (e) {
        console.error(`[samples] failed to load ${pack}`, e);
      }
    }
  })();
  return samplesLoading;
}

function setupGlobals() {
  ensureBrowserShims();
  ensureWebAudioGlobals();
  patchSourceNodeLifecycleGuards();
  // Re-merge strudel namespaces every time. Module-level merge runs once at import;
  // if anything later deletes/overwrites these globals the next render hangs silently.
  Object.assign(globalThis, strudelCore);
  Object.assign(globalThis, strudelMini);
}

type Hap = {
  hasOnset: () => boolean;
  ensureObjectValue: () => void;
  value: unknown;
  duration: { valueOf: () => number };
  whole: { begin: { valueOf: () => number } };
};

type StrudelPattern = {
  queryArc: (begin: number, end: number, opts?: Record<string, unknown>) => Hap[];
};

export type RenderableBuffer = {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  duration: number;
  getChannelData: (channel: number) => Float32Array;
};

export type RenderOptions = {
  cps?: number;
  cycles?: number;
  sampleRate?: number;
};

export async function renderPatternToBuffer(code: string, opts: RenderOptions = {}): Promise<RenderableBuffer> {
  const cps = opts.cps ?? 0.5;
  const cycles = opts.cycles ?? 2;
  const sampleRate = opts.sampleRate ?? 44100;

  setupGlobals();
  // Reset stateful audio graph from any previous render — controller and global effects
  // were bound to the previous OfflineAudioContext and become stale on the next render.
  try {
    superdough.resetGlobalEffects();
  } catch {
    /* ignore */
  }
  try {
    superdough.setSuperdoughAudioController(null);
  } catch {
    /* ignore */
  }

  const audioApi = getNodeWebAudioApi();
  const frames = Math.ceil((cycles / cps) * sampleRate);
  const offlineCtx = new audioApi.OfflineAudioContext(2, frames, sampleRate);
  console.log("[render] offline ctx created", { frames, sampleRate });
  await patchWorkletAddModule(offlineCtx as unknown as AudioContextInstance);
  superdough.setAudioContext(offlineCtx as unknown as AudioContext);
  console.log("[render] initAudio start");
  // disableWorklets — node-web-audio-api OfflineAudioContext.startRendering hangs when
  // a master worklet processor is attached. Effects (compressor/limiter) are skipped;
  // basic sample + synth playback works.
  await superdough.initAudio({ disableWorklets: true });
  console.log("[render] initAudio done");
  superdough.registerSynthSounds();
  superdough.registerZZFXSounds();
  registerFallbackSampleAliases();
  await ensureSamplesLoaded();
  console.log("[render] samples ready, evaluating");

  const result = await strudelTranspiler.evaluate(code);
  const pattern = ((result as { pattern?: StrudelPattern }).pattern ?? result) as StrudelPattern;
  if (!pattern || typeof pattern.queryArc !== "function") {
    throw new Error("Evaluated value is not a queryable pattern");
  }

  const haps = pattern
    .queryArc(0, cycles, { _cps: cps })
    .sort((a, b) => a.whole.begin.valueOf() - b.whole.begin.valueOf());
  console.log("[render] scheduling", haps.length, "haps");

  for (const hap of haps) {
    if (!hap.hasOnset()) continue;
    hap.ensureObjectValue();
    const t = hap.whole.begin.valueOf() / cps;
    const dur = hap.duration.valueOf() / cps;
    try {
      await superdough.superdough(hap.value, t, dur, cps, t);
    } catch (e) {
      console.error("[render] superdough error", e);
    }
  }
  console.log("[render] startRendering...");

  const rendered = await (
    offlineCtx as unknown as { startRendering: () => Promise<RenderableBuffer> }
  ).startRendering();
  console.log("[render] done");
  return rendered;
}

type TrackHandle = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getPid: () => number | undefined;
};

type Track = {
  id: string;
  wavPath: string;
  handle: TrackHandle;
};

const liveTracks = new Map<string, Track>();
let liveState: "playing" | "paused" | "stopped" = "stopped";

function spawnAfplay(wavPath: string, loop: boolean, onEnd?: () => void): TrackHandle {
  let stopped = false;
  let paused = false;
  let current: ChildProcess | null = null;

  function play() {
    if (stopped || paused) return;
    current = spawn("afplay", [wavPath], { stdio: "ignore" });
    current.once("exit", () => {
      current = null;
      if (stopped) return;
      if (loop) {
        play();
      } else {
        stopped = true;
        onEnd?.();
      }
    });
  }

  play();

  return {
    stop() {
      stopped = true;
      const pid = current?.pid;
      current = null;
      if (pid) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* ignore */
        }
      }
    },
    pause() {
      if (paused) return;
      paused = true;
      if (current?.pid) {
        try {
          process.kill(current.pid, "SIGSTOP");
        } catch {
          /* ignore */
        }
      }
    },
    resume() {
      if (!paused) return;
      paused = false;
      if (current?.pid) {
        try {
          process.kill(current.pid, "SIGCONT");
        } catch {
          /* ignore */
        }
      } else {
        play();
      }
    },
    getPid: () => current?.pid,
  };
}

const WAV_REPEATS = 16;

function bufferToWav(buf: RenderableBuffer, repeats = WAV_REPEATS): Buffer {
  const ch = Math.min(buf.numberOfChannels, 2);
  const sr = buf.sampleRate;
  const n = buf.length;
  const dataSize = n * ch * 2 * repeats;
  const out = Buffer.alloc(44 + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(ch, 22);
  out.writeUInt32LE(sr, 24);
  out.writeUInt32LE(sr * ch * 2, 28);
  out.writeUInt16LE(ch * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  const channels = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let off = 44;
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        out.writeInt16LE(Math.round(s * 32767), off);
        off += 2;
      }
    }
  }
  return out;
}

export async function startTrack(id: string, buffer: RenderableBuffer, loop = true) {
  if (liveTracks.has(id)) stopTrack(id);
  const wavPath = path.join(os.tmpdir(), `strudel-${id}.wav`);
  writeFileSync(wavPath, bufferToWav(buffer));
  const handle = spawnAfplay(wavPath, loop, () => stopTrack(id));
  liveTracks.set(id, { id, wavPath, handle });
  liveState = "playing";
}

export function stopTrack(id: string) {
  const t = liveTracks.get(id);
  if (!t) return;
  t.handle.stop();
  fs.unlink(t.wavPath).catch(() => {});
  liveTracks.delete(id);
  if (liveTracks.size === 0) liveState = "stopped";
}

export async function renderAndPlay(
  code: string,
  opts: RenderOptions = {},
  id = "default",
  loop = true,
): Promise<void> {
  const buffer = await withTimeout(renderPatternToBuffer(code, opts), 15000, "render timeout");
  await startTrack(id, buffer, loop);
}

export async function renderAndExport(code: string, opts: RenderOptions = {}, filename: string): Promise<string> {
  const buffer = await withTimeout(renderPatternToBuffer(code, opts), 15000, "render timeout");
  const wavData = bufferToWav(buffer, 1);
  const outPath = path.join(os.homedir(), "Downloads", `${filename}.wav`);
  writeFileSync(outPath, wavData);
  return outPath;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function pauseLive() {
  if (liveState !== "playing") return;
  for (const t of liveTracks.values()) t.handle.pause();
  liveState = "paused";
}

export async function resumeLive() {
  if (liveState !== "paused") return;
  for (const t of liveTracks.values()) t.handle.resume();
  liveState = "playing";
}

export async function stopLive() {
  for (const id of Array.from(liveTracks.keys())) stopTrack(id);
  liveState = "stopped";
}

export function getLiveState(): "playing" | "paused" | "stopped" {
  return liveState;
}

export function getTrackPid(id: string): number | undefined {
  return liveTracks.get(id)?.handle.getPid();
}

const QUICKPLAY_STATE_FILE = path.join(os.tmpdir(), "strudel-quickplay.json");

export function saveQuickPlayState(trackId: string, pid: number): void {
  try {
    writeFileSync(QUICKPLAY_STATE_FILE, JSON.stringify({ trackId, pid }));
  } catch {
    /* ignore */
  }
}

export function stopQuickPlayFromFile(): boolean {
  try {
    const raw = readFileSync(QUICKPLAY_STATE_FILE, "utf8");
    const { trackId, pid } = JSON.parse(raw) as { trackId: string; pid: number };
    unlinkSync(QUICKPLAY_STATE_FILE);
    let wasRunning = false;
    try {
      process.kill(pid, 0);
      wasRunning = true;
    } catch {
      /* process already gone */
    }
    if (wasRunning) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* ignore */
      }
      const wavPath = path.join(os.tmpdir(), `strudel-${trackId}.wav`);
      try {
        unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
    }
    return wasRunning;
  } catch {
    return false;
  }
}

export function getActiveIds(): string[] {
  return Array.from(liveTracks.keys());
}

export function isTrackActive(id: string): boolean {
  return liveTracks.has(id);
}

export function buildStackCode(codes: string[]) {
  if (codes.length === 0) return "silence";
  if (codes.length === 1) return codes[0];
  return `stack(${codes.map((c) => `(${c})`).join(", ")})`;
}
