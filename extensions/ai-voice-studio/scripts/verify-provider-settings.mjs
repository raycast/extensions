import { createTsLoader } from "./lib/ts-loader.mjs";
import { assert, createLocalStorageStub } from "./lib/verify-helpers.mjs";

let preferences = {};
const storageStub = createLocalStorageStub();

const raycastApiStub = {
  LocalStorage: storageStub.LocalStorage,
  getPreferenceValues() {
    return preferences;
  },
};

const loadTs = createTsLoader({ raycastApiStub });

const settings = loadTs("src/utils/provider-settings.ts");

await verifyInvalidFallbacks();
await verifyLegacyPreferencesIgnored();
await verifyTrimmedOverrideFields();
await verifyQuickSetupOverrides();

console.log(
  JSON.stringify(
    {
      checked: [
        "invalid provider preferences fall back safely",
        "legacy command preferences are ignored",
        "text override fields are trimmed",
        "quick setup overrides take precedence and can reset to defaults",
      ],
    },
    null,
    2,
  ),
);

async function verifyInvalidFallbacks() {
  storageStub.storage.clear();
  preferences = {
    defaultProvider: "bad-provider",
    qwenModel: "bad-qwen",
    qwenVoice: "   ",
    qwenLanguageType: "Klingon",
    qwenPlaybackRate: "9",
    qwenInstructions: "   ",
    qwenBaseUrl: "   ",
    mimoModel: "bad-mimo",
    mimoDefaultVoice: "   ",
    mimoSpeechRate: "9",
    mimoStylePrompt: "   ",
    mimoTokenPlanBaseUrl: "   ",
    openaiModel: "bad-openai",
    openaiVoice: "   ",
    openaiResponseFormat: "ogg",
    openaiPlaybackRate: "9",
    openaiInstructions: "   ",
  };

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "qwen", "Invalid default provider should fall back to Qwen-TTS");
  assert(result.qwen.model === "qwen3-tts-flash", "Invalid Qwen-TTS model should fall back safely");
  assert(result.qwen.voice === "Cherry", "Blank Qwen-TTS voice should fall back");
  assert(result.qwen.region === "beijing", "Invalid Qwen-TTS region should fall back");
  assert(result.qwen.languageType === "Auto", "Invalid Qwen-TTS language should fall back");
  assert(result.qwen.playbackRate === "1", "Invalid Qwen-TTS playback rate should fall back");
  assert(result.qwen.instructions === "", "Blank Qwen-TTS instructions should clear");
  assert(result.qwen.optimizeInstructions === false, "Invalid Qwen-TTS optimize flag should fall back");
  assert(result.qwen.baseUrl === "https://dashscope.aliyuncs.com/api/v1", "Blank Qwen-TTS base URL should fall back");
  assert(result.mimo.model === "mimo-v2.5-tts", "Invalid MiMo model should fall back");
  assert(result.mimo.defaultVoice === "Chloe", "Blank MiMo voice should fall back");
  assert(result.mimo.speechRate === "0", "Invalid MiMo speed should fall back");
  assert(result.mimo.stylePrompt === "", "Blank MiMo style prompt should clear");
  assert(
    result.mimo.tokenPlanBaseUrl === "https://token-plan-cn.xiaomimimo.com/v1",
    "Blank MiMo base URL should fall back",
  );
  assert(result.openai.model === "gpt-4o-mini-tts", "Invalid OpenAI model should fall back");
  assert(result.openai.voice === "cedar", "Blank OpenAI voice should fall back");
  assert(result.openai.responseFormat === "wav", "Invalid OpenAI format should fall back");
  assert(result.openai.playbackRate === "1", "Invalid OpenAI playback rate should fall back");
  assert(result.openai.instructions === "", "Blank OpenAI instructions should clear");
}

async function verifyLegacyPreferencesIgnored() {
  storageStub.storage.clear();
  preferences = {
    defaultProvider: "openai",
    qwenModel: "qwen-tts",
    qwenVoice: "Ethan",
    qwenLanguageType: "German",
    qwenPlaybackRate: "1.5",
    qwenInstructions: "Read warmly",
    qwenBaseUrl: "https://example.com/api/v1",
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
  assert(result.defaultProvider === "qwen", "Legacy preference default provider should be ignored");
  assert(result.qwen.model === "qwen3-tts-flash", "Legacy preference Qwen-TTS model should be ignored");
  assert(result.qwen.voice === "Cherry", "Legacy preference Qwen-TTS voice should be ignored");
  assert(result.qwen.region === "beijing", "Legacy preference Qwen-TTS region should be ignored");
  assert(result.qwen.languageType === "Auto", "Legacy preference Qwen-TTS language should be ignored");
  assert(result.qwen.playbackRate === "1", "Legacy preference Qwen-TTS rate should be ignored");
  assert(result.qwen.instructions === "", "Legacy preference Qwen-TTS instructions should be ignored");
  assert(
    result.qwen.baseUrl === "https://dashscope.aliyuncs.com/api/v1",
    "Legacy preference Qwen-TTS base URL should be ignored",
  );
  assert(result.mimo.model === "mimo-v2.5-tts", "Legacy preference MiMo model should be ignored");
  assert(result.mimo.defaultVoice === "Chloe", "Legacy preference MiMo voice should be ignored");
  assert(result.mimo.speechRate === "0", "Legacy preference MiMo speed should be ignored");
  assert(result.mimo.stylePrompt === "", "Legacy preference MiMo style prompt should be ignored");
  assert(
    result.mimo.tokenPlanBaseUrl === "https://token-plan-cn.xiaomimimo.com/v1",
    "Legacy preference MiMo base URL should be ignored",
  );
  assert(result.openai.model === "gpt-4o-mini-tts", "Legacy preference OpenAI model should be ignored");
  assert(result.openai.voice === "cedar", "Legacy preference OpenAI voice should be ignored");
  assert(result.openai.responseFormat === "wav", "Legacy preference OpenAI format should be ignored");
  assert(result.openai.playbackRate === "1", "Legacy preference OpenAI rate should be ignored");
  assert(result.openai.instructions === "", "Legacy preference OpenAI instructions should be ignored");
}

async function verifyTrimmedOverrideFields() {
  storageStub.storage.clear();
  preferences = {};

  await settings.saveProviderSettingsOverrides({
    defaultProvider: "mimo",
    qwen: {
      instructions: "  German newsreader  ",
      baseUrl: "  https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation  ",
    },
    mimo: {
      stylePrompt: "  natural  ",
      tokenPlanBaseUrl: "  https://example.com/v1/chat/completions  ",
    },
    openai: {
      instructions: "  warm  ",
    },
  });

  const result = await settings.getProviderSettings();
  assert(result.defaultProvider === "mimo", "MiMo default provider should be preserved");
  assert(result.qwen.instructions === "German newsreader", "Qwen-TTS instructions should be trimmed");
  assert(result.qwen.region === "beijing", "Qwen-TTS default endpoint should infer Beijing region");
  assert(result.qwen.baseUrl === "https://dashscope.aliyuncs.com/api/v1", "Qwen-TTS base URL should be trimmed");
  assert(result.mimo.stylePrompt === "natural", "MiMo style prompt should be trimmed");
  assert(result.mimo.tokenPlanBaseUrl === "https://example.com/v1", "MiMo base URL should be trimmed");
  assert(result.openai.instructions === "warm", "OpenAI instructions should be trimmed");
}

async function verifyQuickSetupOverrides() {
  storageStub.storage.clear();
  preferences = {};

  await settings.saveProviderSettingsOverrides({
    defaultProvider: "openai",
    qwen: {
      model: "qwen3-tts-instruct-flash",
      voice: "Ethan",
      region: "custom",
      languageType: "Spanish",
      playbackRate: "1.25",
      instructions: "Energetic but precise",
      optimizeInstructions: true,
      baseUrl: "https://example.com/api/v1",
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
  assert(result.qwen.model === "qwen3-tts-instruct-flash", "Quick setup should override Qwen-TTS model");
  assert(result.qwen.voice === "Ethan", "Quick setup should override Qwen-TTS voice");
  assert(result.qwen.region === "custom", "Quick setup should override Qwen-TTS region");
  assert(result.qwen.languageType === "Spanish", "Quick setup should override Qwen-TTS language");
  assert(result.qwen.playbackRate === "1.25", "Quick setup should override Qwen-TTS playback rate");
  assert(result.qwen.instructions === "Energetic but precise", "Quick setup should override Qwen-TTS instructions");
  assert(result.qwen.optimizeInstructions === true, "Quick setup should override Qwen-TTS optimize instructions");
  assert(result.qwen.baseUrl === "https://example.com/api/v1", "Quick setup should override Qwen-TTS base URL");
  assert(result.mimo.defaultVoice === "default_en", "Quick setup should override MiMo voice");
  assert(result.mimo.tokenPlanBaseUrl === "https://example.com/v1", "Quick setup should override MiMo base URL");
  assert(result.openai.responseFormat === "wav", "Quick setup should override OpenAI format");

  await settings.clearProviderSettingsOverrides();
  const reset = await settings.getProviderSettings();
  assert(reset.defaultProvider === "qwen", "Clearing quick setup should return to defaults");
  assert(reset.qwen.voice === "Cherry", "Clearing quick setup should restore default Qwen-TTS voice");
  assert(reset.openai.voice === "cedar", "Clearing quick setup should restore default OpenAI voice");
}
