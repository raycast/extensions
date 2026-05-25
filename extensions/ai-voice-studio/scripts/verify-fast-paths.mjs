import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const moduleCache = new Map();
const storage = new Map();

const raycastApiStub = {
  LocalStorage: {
    async getItem(key) {
      return storage.get(key);
    },
    async setItem(key, value) {
      storage.set(key, value);
    },
    async removeItem(key) {
      storage.delete(key);
    },
  },
};

function loadTs(relativePath) {
  const filename = resolveTs(path.join(root, relativePath));
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;

  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
    },
    fileName: filename,
  }).outputText;

  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  moduleCache.set(filename, mod);

  const nativeRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request === "@raycast/api") return raycastApiStub;
    if (request.startsWith(".")) {
      const next = resolveTs(path.resolve(path.dirname(filename), request));
      return loadTs(path.relative(root, next));
    }
    return nativeRequire(request);
  };

  mod._compile(compiled, filename);
  return mod.exports;
}

function resolveTs(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
  ];
  const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!found) {
    throw new Error(`Cannot resolve module ${candidate}`);
  }
  return found;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function allChunksWithin(chunks, limit, measure) {
  return chunks.length > 0 && chunks.every((chunk) => chunk.trim() === chunk && measure(chunk) <= limit);
}

function codePointLength(text) {
  return Array.from(text).length;
}

const qwenChunker = loadTs("src/utils/qwen-text-chunker.ts");
const qwenVoices = loadTs("src/constants/qwen-tts-voices.ts");
const mimoChunker = loadTs("src/utils/mimo-text-chunker.ts");
const openAIChunker = loadTs("src/utils/openai-text-chunker.ts");
const qwenSpeed = loadTs("src/utils/qwen-playback-state.ts");
const mimoSpeed = loadTs("src/utils/mimo-playback-state.ts");
const openAISpeed = loadTs("src/utils/openai-playback-state.ts");

assert(qwenChunker.chunkText("   ").length === 0, "Qwen-TTS chunker should ignore blank text");
assert(
  allChunksWithin(qwenChunker.chunkText("法".repeat(1600)), 550, codePointLength),
  "Qwen-TTS chunks should stay under 550 code points",
);
assert(
  allChunksWithin(qwenChunker.chunkText("😀".repeat(800)), 550, codePointLength),
  "Qwen-TTS chunks should count emoji as code points",
);

const qwenVoiceKeywords = new Map(
  qwenVoices.VOICES.map((voice) => [voice.id, qwenVoices.getVoiceSearchKeywords(voice)]),
);
assert(
  qwenVoiceKeywords.get("Cherry")?.includes("Chinese") &&
    qwenVoiceKeywords.get("Cherry")?.includes("English") &&
    qwenVoiceKeywords.get("Cherry")?.includes("German"),
  "Qwen-TTS recommended voices should be searchable by Chinese, English, and German language aliases",
);
assert(
  qwenVoiceKeywords.get("Ethan")?.includes("qwen") && qwenVoiceKeywords.get("Ethan")?.includes("dashscope"),
  "Qwen-TTS voices should be searchable by provider aliases",
);
assert(
  qwenVoices.getVoicesForModel("qwen3-tts-flash").some((voice) => voice.id === "Cherry") &&
    qwenVoices.getVoicesForModel("qwen-tts").some((voice) => voice.id === "Cherry"),
  "Qwen-TTS default voice should be available on current and latest aliases",
);

assert(
  allChunksWithin(mimoChunker.chunkText("语".repeat(2500)), 4096, (chunk) => Buffer.byteLength(chunk, "utf8")),
  "MiMo chunks should stay under 4096 UTF-8 bytes",
);
assert(
  allChunksWithin(mimoChunker.chunkText("This is a sentence. ".repeat(500)), 4096, (chunk) =>
    Buffer.byteLength(chunk, "utf8"),
  ),
  "MiMo English chunks should stay under 4096 UTF-8 bytes",
);

assert(
  allChunksWithin(openAIChunker.chunkText("OpenAI speech sentence. ".repeat(300)), 1800, (chunk) => chunk.length),
  "OpenAI chunks should stay under 1800 UTF-16 code units",
);

assert(qwenSpeed.clampSpeed(0.1) === 0.5, "Qwen-TTS speed should clamp to minimum");
assert(qwenSpeed.clampSpeed(9) === 2, "Qwen-TTS speed should clamp to maximum");
assert(qwenSpeed.clampSpeed(1.37) === 1.25, "Qwen-TTS speed should snap to 0.25 steps");
assert(qwenSpeed.formatSpeed(1) === "1x", "Qwen-TTS speed formatter should show normal speed");

await qwenSpeed.setSpeedOverride(9);
assert((await qwenSpeed.getSpeedOverride()) === 2, "Qwen-TTS stored playback speed should be clamped");
await qwenSpeed.clearSpeedOverride();
assert((await qwenSpeed.getSpeedOverride()) === null, "Qwen-TTS playback speed should clear");

assert(mimoSpeed.parseRateString("-50") === 0.5, "MiMo legacy -50 rate should mean 0.5x");
assert(mimoSpeed.parseRateString("25") === 1.25, "MiMo legacy 25 rate should mean 1.25x");
assert(mimoSpeed.parseRateString("1.25") === 1.25, "MiMo decimal rate should parse");
assert(mimoSpeed.parseRateString("bad") === 1, "MiMo invalid rate should fall back to normal");
assert((await mimoSpeed.setSpeedOverride(1.37)) === 1.25, "MiMo speed override should snap to 0.25 steps");

assert(openAISpeed.parseRateString("1.25") === 1.25, "OpenAI decimal rate should parse");
assert(openAISpeed.parseRateString("bad") === 1, "OpenAI invalid rate should fall back to normal");
assert((await openAISpeed.setSpeedOverride(9)) === 2, "OpenAI speed override should clamp to maximum");

console.log(
  JSON.stringify(
    {
      checked: [
        "Qwen-TTS chunk limits",
        "Qwen-TTS voice language search keywords",
        "Qwen-TTS default voice model coverage",
        "MiMo byte chunk limits",
        "OpenAI chunk limits",
        "Qwen-TTS speed clamp/storage",
        "MiMo speed parsing/storage",
        "OpenAI speed parsing/storage",
      ],
    },
    null,
    2,
  ),
);
