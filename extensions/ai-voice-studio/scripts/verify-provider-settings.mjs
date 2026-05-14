import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
let preferences = {};
const storage = new Map();
const moduleCache = new Map();

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
  getPreferenceValues() {
    return preferences;
  },
};

const settings = loadTs("src/utils/provider-settings.ts");

await verifyInvalidFallbacks();
await verifyValidProviderSettings();
await verifyTrimmedTextFields();
await verifyQuickSetupOverrides();

console.log(
  JSON.stringify(
    {
      checked: [
        "invalid provider preferences fall back safely",
        "valid provider preferences are preserved",
        "text preferences are trimmed",
        "quick setup overrides take precedence and can reset",
      ],
    },
    null,
    2,
  ),
);

async function verifyInvalidFallbacks() {
  storage.clear();
  preferences = {
    defaultProvider: "bad-provider",
    authMode: "bad-auth",
    minimaxModel: "bad-model",
    minimaxDefaultVoice: "   ",
    minimaxCustomDefaultVoice: "   ",
    minimaxCustomVoiceIds: "   ",
    minimaxLanguageBoost: "bad-language",
    minimaxSpeechRate: "9",
    region: "bad-region",
    mimoModel: "bad-mimo",
    mimoDefaultVoice: "   ",
    mimoSpeechRate: "9",
    mimoStylePrompt: "   ",
    mimoTokenPlanBaseUrl: "   ",
    openaiModel: "bad-openai",
    openaiVoice: "   ",
    openaiResponseFormat: "flac",
    openaiPlaybackRate: "9",
    openaiInstructions: "   ",
  };

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "minimax", "Invalid default provider should fall back to MiniMax");
  assert(result.minimax.authMode === "auto", "Invalid MiniMax auth mode should fall back");
  assert(result.minimax.model === "speech-2.8-hd", "Invalid MiniMax model should fall back safely");
  assert(result.minimax.defaultVoice === "Chinese (Mandarin)_Radio_Host", "Blank MiniMax voice should fall back");
  assert(result.minimax.customDefaultVoice === "", "Blank custom MiniMax voice should clear");
  assert(result.minimax.customVoiceIds === "", "Blank custom MiniMax voice list should clear");
  assert(result.minimax.languageBoost === "auto", "Invalid MiniMax language boost should fall back");
  assert(result.minimax.speechRate === "1", "Invalid MiniMax speed should fall back");
  assert(result.minimax.region === "cn", "Invalid MiniMax region should fall back");
  assert(result.mimo.model === "mimo-v2.5-tts", "Invalid MiMo model should fall back");
  assert(result.mimo.defaultVoice === "mimo_default", "Blank MiMo voice should fall back");
  assert(result.mimo.speechRate === "0", "Invalid MiMo speed should fall back");
  assert(result.mimo.stylePrompt === "", "Blank MiMo style prompt should clear");
  assert(
    result.mimo.tokenPlanBaseUrl === "https://token-plan-cn.xiaomimimo.com/v1",
    "Blank MiMo base URL should fall back",
  );
  assert(result.openai.model === "gpt-4o-mini-tts", "Invalid OpenAI model should fall back");
  assert(result.openai.voice === "cedar", "Blank OpenAI voice should fall back");
  assert(result.openai.responseFormat === "mp3", "Invalid OpenAI format should fall back");
  assert(result.openai.playbackRate === "1", "Invalid OpenAI playback rate should fall back");
  assert(result.openai.instructions === "", "Blank OpenAI instructions should clear");
}

async function verifyValidProviderSettings() {
  storage.clear();
  preferences = {
    defaultProvider: "openai",
    authMode: "payg",
    minimaxModel: "speech-2.8-turbo",
    minimaxDefaultVoice: "English_CalmWoman",
    minimaxCustomDefaultVoice: "voice_custom",
    minimaxCustomVoiceIds: "voice_a,voice_b",
    minimaxLanguageBoost: "English",
    minimaxSpeechRate: "1.25",
    region: "global",
    mimoModel: "mimo-v2-tts",
    mimoDefaultVoice: "default_en",
    mimoSpeechRate: "25",
    mimoStylePrompt: "Clear and brisk",
    mimoTokenPlanBaseUrl: "https://example.com/v1/",
    openaiModel: "tts-1-hd",
    openaiVoice: "alloy",
    openaiResponseFormat: "wav",
    openaiPlaybackRate: "1.5",
    openaiInstructions: "Speak clearly",
  };

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "openai", "Valid default provider should be preserved");
  assert(result.minimax.authMode === "payg", "Valid MiniMax auth mode should be preserved");
  assert(result.minimax.model === "speech-2.8-turbo", "Valid MiniMax model should be preserved");
  assert(result.minimax.defaultVoice === "English_CalmWoman", "Valid MiniMax voice should be preserved");
  assert(result.minimax.customDefaultVoice === "voice_custom", "Custom MiniMax voice should be preserved");
  assert(result.minimax.customVoiceIds === "voice_a,voice_b", "Custom MiniMax voice list should be preserved");
  assert(result.minimax.languageBoost === "English", "Valid MiniMax language boost should be preserved");
  assert(result.minimax.speechRate === "1.25", "Valid MiniMax speech rate should be preserved");
  assert(result.minimax.region === "global", "Valid MiniMax region should be preserved");
  assert(result.mimo.model === "mimo-v2-tts", "Valid MiMo model should be preserved");
  assert(result.mimo.defaultVoice === "default_en", "Valid MiMo voice should be preserved");
  assert(result.mimo.speechRate === "25", "Valid MiMo speed should be preserved");
  assert(result.mimo.stylePrompt === "Clear and brisk", "MiMo style prompt should be preserved");
  assert(result.mimo.tokenPlanBaseUrl === "https://example.com/v1", "MiMo base URL should be normalized");
  assert(result.openai.model === "tts-1-hd", "Valid OpenAI model should be preserved");
  assert(result.openai.voice === "alloy", "Valid OpenAI voice should be preserved");
  assert(result.openai.responseFormat === "wav", "Valid OpenAI format should be preserved");
  assert(result.openai.playbackRate === "1.5", "Valid OpenAI rate should be preserved");
  assert(result.openai.instructions === "Speak clearly", "OpenAI instructions should be preserved");
}

async function verifyTrimmedTextFields() {
  storage.clear();
  preferences = {
    defaultProvider: "mimo",
    minimaxCustomDefaultVoice: "  custom_voice  ",
    minimaxCustomVoiceIds: "  a,b  ",
    mimoStylePrompt: "  natural  ",
    mimoTokenPlanBaseUrl: "  https://example.com/v1/chat/completions  ",
    openaiInstructions: "  warm  ",
  };

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "mimo", "MiMo default provider should be preserved");
  assert(result.minimax.customDefaultVoice === "custom_voice", "Custom default voice should be trimmed");
  assert(result.minimax.customVoiceIds === "a,b", "Custom voice IDs should be trimmed");
  assert(result.mimo.stylePrompt === "natural", "MiMo style prompt should be trimmed");
  assert(result.mimo.tokenPlanBaseUrl === "https://example.com/v1", "MiMo base URL should be trimmed");
  assert(result.openai.instructions === "warm", "OpenAI instructions should be trimmed");
}

async function verifyQuickSetupOverrides() {
  storage.clear();
  preferences = {
    defaultProvider: "minimax",
    authMode: "auto",
    minimaxModel: "speech-2.8-hd",
    minimaxDefaultVoice: "Chinese (Mandarin)_Radio_Host",
    minimaxSpeechRate: "1",
    mimoModel: "mimo-v2.5-tts",
    mimoDefaultVoice: "mimo_default",
    mimoSpeechRate: "0",
    openaiModel: "gpt-4o-mini-tts",
    openaiVoice: "cedar",
    openaiPlaybackRate: "1",
  };

  await settings.saveProviderSettingsOverrides({
    defaultProvider: "openai",
    minimax: {
      authMode: "token-plan",
      model: "speech-2.6-hd",
      defaultVoice: "English_CalmWoman",
      speechRate: "1.25",
      region: "global",
    },
    mimo: {
      model: "mimo-v2-tts",
      defaultVoice: "default_en",
      speechRate: "25",
      stylePrompt: "warm",
      tokenPlanBaseUrl: "https://example.com/v1",
    },
    openai: {
      model: "tts-1",
      voice: "alloy",
      responseFormat: "wav",
      playbackRate: "1.5",
      instructions: "clear",
    },
  });

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "openai", "Quick setup should override default provider");
  assert(result.minimax.authMode === "token-plan", "Quick setup should override MiniMax auth mode");
  assert(result.minimax.model === "speech-2.6-hd", "Quick setup should override MiniMax model");
  assert(result.minimax.region === "global", "Quick setup should override MiniMax region");
  assert(result.mimo.defaultVoice === "default_en", "Quick setup should override MiMo voice");
  assert(result.mimo.tokenPlanBaseUrl === "https://example.com/v1", "Quick setup should override MiMo base URL");
  assert(result.openai.responseFormat === "wav", "Quick setup should override OpenAI format");

  await settings.clearProviderSettingsOverrides();
  const reset = await settings.getProviderSettings();
  assert(reset.defaultProvider === "minimax", "Clearing quick setup should return to preferences");
  assert(reset.minimax.authMode === "auto", "Clearing quick setup should restore preference auth mode");
  assert(reset.openai.voice === "cedar", "Clearing quick setup should restore preference voice");
}

function loadTs(relativePath) {
  const filename = path.join(root, relativePath);
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
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`];
  const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!found) throw new Error(`Cannot resolve module ${candidate}`);
  return found;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
