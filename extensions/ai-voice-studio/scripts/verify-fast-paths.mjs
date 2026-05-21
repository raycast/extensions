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

const miniMaxChunker = loadTs("src/utils/text-chunker.ts");
const miniMaxVoices = loadTs("src/constants/voices.ts");
const mimoChunker = loadTs("src/utils/mimo-text-chunker.ts");
const openAIChunker = loadTs("src/utils/openai-text-chunker.ts");
const miniMaxSpeed = loadTs("src/utils/playback-speed.ts");
const mimoSpeed = loadTs("src/utils/mimo-playback-state.ts");
const openAISpeed = loadTs("src/utils/openai-playback-state.ts");

assert(miniMaxChunker.chunkText("   ").length === 0, "MiniMax chunker should ignore blank text");
assert(
  allChunksWithin(miniMaxChunker.chunkText("法".repeat(4300)), 1400, codePointLength),
  "MiniMax chunks should stay under 1400 code points",
);
assert(
  allChunksWithin(miniMaxChunker.chunkText("😀".repeat(1500)), 1400, codePointLength),
  "MiniMax chunks should count emoji as code points",
);

const miniMaxVoiceKeywords = new Map(
  miniMaxVoices.FALLBACK_VOICES.map((voice) => [voice.id, miniMaxVoices.getVoiceSearchKeywords(voice)]),
);
assert(
  miniMaxVoiceKeywords.get("Chinese (Mandarin)_Radio_Host")?.includes("普通话") &&
    miniMaxVoiceKeywords.get("Chinese (Mandarin)_Radio_Host")?.includes("Mandarin"),
  "MiniMax Chinese voices should be searchable by Chinese and English language aliases",
);
assert(
  miniMaxVoiceKeywords.get("English_CalmWoman")?.includes("英语") &&
    miniMaxVoiceKeywords.get("English_CalmWoman")?.includes("en"),
  "MiniMax English voices should be searchable by Chinese and ISO-like language aliases",
);
assert(
  miniMaxVoiceKeywords.get("German_FriendlyMan")?.includes("德语") &&
    miniMaxVoiceKeywords.get("German_FriendlyMan")?.includes("Deutsch"),
  "MiniMax German voices should be searchable by Chinese and native language aliases",
);
assert(
  miniMaxVoices.getVoiceSearchKeywords({
    id: "legacy_voice",
    name: "Legacy Voice",
    category: "Legacy",
    description: ["not", "a", "string"],
    gender: "neutral",
  }).includes("Legacy"),
  "MiniMax voice search keywords should tolerate malformed cached voice metadata",
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

assert(miniMaxSpeed.clampSpeed(0.1) === 0.5, "MiniMax speed should clamp to minimum");
assert(miniMaxSpeed.clampSpeed(9) === 2, "MiniMax speed should clamp to maximum");
assert(miniMaxSpeed.clampSpeed(1.37) === 1.25, "MiniMax speed should snap to 0.25 steps");
assert(miniMaxSpeed.formatSpeed(1) === "1.0×", "MiniMax speed formatter should show normal speed");

await miniMaxSpeed.writePlaybackSpeed(9);
assert((await miniMaxSpeed.readPlaybackSpeed()) === 2, "MiniMax stored playback speed should be clamped");
await miniMaxSpeed.clearPlaybackSpeed();
assert((await miniMaxSpeed.readPlaybackSpeed()) === null, "MiniMax playback speed should clear");

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
        "MiniMax chunk limits",
        "MiniMax voice language search keywords",
        "MiniMax voice malformed metadata guard",
        "MiMo byte chunk limits",
        "OpenAI chunk limits",
        "MiniMax speed clamp/storage",
        "MiMo speed parsing/storage",
        "OpenAI speed parsing/storage",
      ],
    },
    null,
    2,
  ),
);
