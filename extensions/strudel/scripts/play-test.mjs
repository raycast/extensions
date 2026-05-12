// Standalone test for "option 2": run @strudel/webaudio inside Node via
// node-web-audio-api. If this prints frames + makes sound through the
// default audio output for ~4s, the path is viable for Raycast.

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as nwa from "node-web-audio-api";

// --- 1. Polyfill globals @strudel/* expects from a browser ----------------
// `superdough.initAudio` early-returns if `window` is undefined, so we
// pretend to be a browser-ish environment.
globalThis.window = globalThis;
globalThis.document = {
  createElement: () => ({ click: () => {}, appendChild: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};
globalThis.CustomEvent ??= class CustomEvent {
  constructor() {}
};
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.location ??= { href: "http://localhost/", origin: "http://localhost" };
globalThis.URL ??= URL;
globalThis.fetch ??= async () => {
  throw new Error("fetch not available in node-strudel");
};
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "node" }, configurable: true });
}

// Web Audio classes from node-web-audio-api
for (const k of [
  "AudioContext",
  "OfflineAudioContext",
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
  "AudioNode",
  "AudioScheduledSourceNode",
  "AudioListener",
  "PeriodicWave",
  "IIRFilterNode",
  "PannerNode",
  "MediaStreamAudioSourceNode",
]) {
  if (nwa[k]) globalThis[k] = nwa[k];
}

// btoa/atob exist in Node, but make sure
globalThis.btoa ??= (s) => Buffer.from(s, "binary").toString("base64");
globalThis.atob ??= (s) => Buffer.from(s, "base64").toString("binary");

// --- 2. Patch audioWorklet.addModule to accept data: URLs -----------------
// node-web-audio-api 1.0.9 supports file paths, http(s), and blob: URLs but
// NOT data: URLs. Strudel bundles its worklets as data:text/javascript;base64.
// Workaround: decode the data URL and write to a temp .js file, then call
// the original addModule on that path.
function patchAudioWorklet(ctx) {
  const aw = ctx.audioWorklet;
  const orig = aw.addModule.bind(aw);
  aw.addModule = async (url) => {
    if (typeof url === "string" && url.startsWith("data:")) {
      const m = /^data:[^;]*;base64,(.*)$/.exec(url);
      if (!m) throw new Error("Unsupported data: URL");
      const code = Buffer.from(m[1], "base64").toString("utf8");
      const file = path.join(os.tmpdir(), `strudel-worklet-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
      await fs.writeFile(file, code, "utf8");
      return orig(file);
    }
    return orig(url);
  };
  return ctx;
}

// --- 3. Build a real-time AudioContext and wire up Strudel ----------------
const ctx = patchAudioWorklet(new nwa.AudioContext());

const strudelCore = await import("@strudel/core");
const sd = await import("superdough");

Object.assign(globalThis, strudelCore);

sd.setAudioContext(ctx);
const wa = await import("@strudel/webaudio");

// initAudio loads the supradough+superdough worklets (data: URLs)
await sd.initAudio({});
sd.registerSynthSounds();
sd.registerZZFXSounds();

const { repl, evaluate } = strudelCore;

const { scheduler } = wa.webaudioRepl({
  audioContext: ctx,
  onSchedulerError: (e) => console.error("scheduler:", e),
  onEvalError: (e) => console.error("eval:", e),
});

// minimal synth-only pattern (no samples needed)
const code = `note("c3 eb3 g3 bb3").s("sawtooth").gain(0.3)`;
const { pattern } = await evaluate(code);
scheduler.setPattern(pattern, true);
scheduler.start();
console.log("[strudel] playing for 4s at sampleRate=", ctx.sampleRate);

await new Promise((r) => setTimeout(r, 4000));
scheduler.stop();
await ctx.close();
console.log("[strudel] done");
