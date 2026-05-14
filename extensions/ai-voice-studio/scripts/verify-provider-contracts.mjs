import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const moduleCache = new Map();
let preferences = {};
let fetchCalls = [];
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
  getPreferenceValues() {
    return preferences;
  },
};

function setPreferences(next) {
  preferences = next;
  storage.clear();
}

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
  if (!found) throw new Error(`Cannot resolve module ${candidate}`);
  return found;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonResponse(body, status = 200, statusText = "OK") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

function binaryResponse(body, status = 200, statusText = "OK") {
  return new Response(Buffer.from(body), { status, statusText });
}

async function expectRejects(fn, predicate, message) {
  try {
    await fn();
  } catch (error) {
    assert(predicate(error), message);
    return error;
  }
  throw new Error(message);
}

function installFetch(handler) {
  fetchCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), init, body: init.body ? JSON.parse(String(init.body)) : null };
    fetchCalls.push(call);
    if (init.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return handler(call);
  };
}

const minimax = loadTs("src/api/minimax-tts.ts");
const mimo = loadTs("src/api/mimo-tts.ts");
const openai = loadTs("src/api/openai-tts.ts");
const providerSettings = loadTs("src/utils/provider-settings.ts");

await verifyFocusedSetupOptionBuilders();
await verifyMiniMaxFocusedSetupAuthRouting();
await verifyMiniMax();
await verifyMiMo();
await verifyOpenAI();

console.log(
  JSON.stringify(
    {
      checked: [
        "Focused setup overrides flow into provider option builders",
        "Focused setup MiniMax auth mode controls runtime key routing",
        "MiniMax request/hex decode/error/cancel contract",
        "MiMo request/base64/error/cancel contract",
        "OpenAI request/binary decode/error/cancel contract",
      ],
    },
    null,
    2,
  ),
);

async function verifyFocusedSetupOptionBuilders() {
  setPreferences({
    defaultProvider: "minimax",
    minimaxModel: "speech-2.8-hd",
    minimaxDefaultVoice: "Chinese (Mandarin)_Radio_Host",
    minimaxLanguageBoost: "auto",
    minimaxSpeechRate: "1",
    region: "cn",
  });
  await providerSettings.saveProviderSettingsOverrides({
    minimax: {
      model: "speech-2.6-hd",
      defaultVoice: "English_CalmWoman",
      languageBoost: "English",
      speechRate: "1.25",
      region: "global",
    },
  });
  const miniMaxOptions = await minimax.buildOptionsFromPrefs();
  assert(miniMaxOptions.model === "speech-2.6-hd", "MiniMax options should use focused setup model");
  assert(miniMaxOptions.voiceId === "English_CalmWoman", "MiniMax options should use focused setup voice");
  assert(miniMaxOptions.languageBoost === "English", "MiniMax options should use focused setup language boost");
  assert(miniMaxOptions.speed === 1.25, "MiniMax options should parse focused setup speed");
  assert(miniMaxOptions.region === "global", "MiniMax options should use focused setup region");

  setPreferences({
    mimoModel: "mimo-v2.5-tts",
    mimoDefaultVoice: "mimo_default",
    mimoSpeechRate: "0",
    mimoStylePrompt: "",
    mimoTokenPlanBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  });
  await providerSettings.saveProviderSettingsOverrides({
    mimo: {
      model: "mimo-v2-tts",
      defaultVoice: "default_en",
      speechRate: "25",
      stylePrompt: "Warm base",
      tokenPlanBaseUrl: "https://custom.mimo/v1/chat/completions",
    },
  });
  const mimoOptions = await mimo.buildOptionsFromPrefs();
  assert(mimoOptions.model === "mimo-v2-tts", "MiMo options should use focused setup model");
  assert(mimoOptions.voice === "default_en", "MiMo options should use focused setup voice");
  assert(mimoOptions.playbackRate === 1.25, "MiMo options should parse focused setup speed");
  assert(mimoOptions.stylePrompt?.includes("Warm base"), "MiMo options should include focused setup style prompt");
  assert(
    mimoOptions.tokenPlanBaseUrl === "https://custom.mimo/v1",
    "MiMo options should normalize and use focused setup base URL",
  );

  setPreferences({
    openaiModel: "gpt-4o-mini-tts",
    openaiVoice: "cedar",
    openaiResponseFormat: "mp3",
    openaiPlaybackRate: "1",
    openaiInstructions: "",
  });
  await providerSettings.saveProviderSettingsOverrides({
    openai: {
      model: "gpt-4o-mini-tts",
      voice: "coral",
      responseFormat: "wav",
      playbackRate: "1.5",
      instructions: "Clear base",
    },
  });
  const openAIOptions = await openai.buildOptionsFromPrefs();
  assert(openAIOptions.model === "gpt-4o-mini-tts", "OpenAI options should use focused setup model");
  assert(openAIOptions.voice === "coral", "OpenAI options should use focused setup voice");
  assert(openAIOptions.format === "wav", "OpenAI options should use focused setup format");
  assert(openAIOptions.playbackRate === 1.5, "OpenAI options should parse focused setup playback rate");
  assert(openAIOptions.instructions?.includes("Clear base"), "OpenAI options should include focused setup instructions");
}

async function verifyMiniMaxFocusedSetupAuthRouting() {
  setPreferences({
    tokenPlanKey: "tp-minimax-test",
    openPlatformApiKey: "op-minimax-test",
    minimaxModel: "speech-2.8-hd",
    minimaxDefaultVoice: "Chinese (Mandarin)_Radio_Host",
    minimaxLanguageBoost: "auto",
    minimaxSpeechRate: "1",
    region: "cn",
  });
  await providerSettings.saveProviderSettingsOverrides({
    minimax: {
      authMode: "payg",
      model: "speech-2.8-hd",
      defaultVoice: "Chinese (Mandarin)_Radio_Host",
      languageBoost: "auto",
      speechRate: "1",
      region: "cn",
    },
  });

  installFetch((call) => {
    assert(
      call.init.headers.Authorization === "Bearer op-minimax-test",
      "MiniMax focused setup payg auth mode should choose the Open Platform key",
    );
    return jsonResponse({
      data: { audio: Buffer.from("payg-audio").toString("hex") },
      base_resp: { status_code: 0, status_msg: "ok" },
    });
  });

  await minimax.synthesizeSpeech("Hello MiniMax", {
    voiceId: "Chinese (Mandarin)_Radio_Host",
    model: "speech-2.8-hd",
    speed: 1,
    languageBoost: "auto",
    region: "cn",
    format: "mp3",
    sampleRate: 32000,
    bitrate: 128000,
  });

  setPreferences({
    tokenPlanKey: "tp-minimax-test",
    openPlatformApiKey: "op-minimax-test",
    minimaxModel: "speech-2.8-turbo",
    minimaxDefaultVoice: "Chinese (Mandarin)_Radio_Host",
    minimaxLanguageBoost: "auto",
    minimaxSpeechRate: "1",
    region: "cn",
  });
  await providerSettings.saveProviderSettingsOverrides({
    minimax: {
      authMode: "token-plan",
      model: "speech-2.8-turbo",
      defaultVoice: "Chinese (Mandarin)_Radio_Host",
      languageBoost: "auto",
      speechRate: "1",
      region: "cn",
    },
  });
  installFetch(() => {
    throw new Error("MiniMax token-plan turbo rejection should happen before fetch");
  });

  await expectRejects(
    () =>
      minimax.synthesizeSpeech("Hello MiniMax", {
        voiceId: "Chinese (Mandarin)_Radio_Host",
        model: "speech-2.8-turbo",
        speed: 1,
        languageBoost: "auto",
        region: "cn",
        format: "mp3",
        sampleRate: 32000,
        bitrate: 128000,
      }),
    (error) => error.name === "TTSApiError" && error.code === -6,
    "MiniMax focused setup token-plan auth mode should reject Token Plan-incompatible models",
  );
}

async function verifyMiniMax() {
  setPreferences({
    authMode: "auto",
    tokenPlanKey: "tp-minimax-test",
    openPlatformApiKey: "",
    region: "cn",
    minimaxModel: "speech-2.8-hd",
    minimaxDefaultVoice: "Chinese (Mandarin)_Radio_Host",
    minimaxLanguageBoost: "auto",
    minimaxSpeechRate: "1",
  });

  installFetch((call) => {
    assert(call.url === "https://api.minimaxi.com/v1/t2a_v2", "MiniMax should call CN t2a_v2 endpoint");
    assert(call.init.method === "POST", "MiniMax should use POST");
    assert(call.init.headers.Authorization === "Bearer tp-minimax-test", "MiniMax should send token plan bearer key");
    assert(call.body.model === "speech-2.8-hd", "MiniMax should send model");
    assert(call.body.output_format === "hex", "MiniMax should request hex audio");
    assert(call.body.voice_setting.voice_id === "Chinese (Mandarin)_Radio_Host", "MiniMax should send voice id");
    return jsonResponse({
      data: { audio: Buffer.from("minimax-audio").toString("hex") },
      base_resp: { status_code: 0, status_msg: "ok" },
      trace_id: "trace-test",
    });
  });

  const miniAudio = await minimax.synthesizeSpeech("Hello MiniMax", {
    voiceId: "Chinese (Mandarin)_Radio_Host",
    model: "speech-2.8-hd",
    speed: 1,
    languageBoost: "auto",
    region: "cn",
    format: "mp3",
    sampleRate: 32000,
    bitrate: 128000,
  });
  assert(miniAudio === Buffer.from("minimax-audio").toString("base64"), "MiniMax should return base64 audio");

  installFetch(() =>
    jsonResponse({ base_resp: { status_code: 1001, status_msg: "bad request" }, trace_id: "trace-test" }),
  );
  await expectRejects(
    () =>
      minimax.synthesizeSpeech("Hello MiniMax", {
        voiceId: "Chinese (Mandarin)_Radio_Host",
        model: "speech-2.8-hd",
        speed: 1,
        languageBoost: "auto",
        region: "cn",
        format: "mp3",
        sampleRate: 32000,
        bitrate: 128000,
      }),
    (error) => error.name === "TTSApiError" && error.message.includes("bad request"),
    "MiniMax should reject non-zero base_resp",
  );

  const controller = new AbortController();
  controller.abort();
  await expectRejects(
    () =>
      minimax.synthesizeSpeech(
        "Hello MiniMax",
        {
          voiceId: "Chinese (Mandarin)_Radio_Host",
          model: "speech-2.8-hd",
          speed: 1,
          languageBoost: "auto",
          region: "cn",
          format: "mp3",
          sampleRate: 32000,
          bitrate: 128000,
        },
        controller.signal,
      ),
    (error) => error.name === "TTSApiError" && error.code === -7,
    "MiniMax should reject pre-aborted synthesis",
  );
}

async function verifyMiMo() {
  setPreferences({
    mimoApiKey: "tp-mimo-test",
    mimoTokenPlanBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    mimoModel: "mimo-v2.5-tts",
    mimoDefaultVoice: "mimo_default",
    mimoSpeechRate: "0",
    mimoStylePrompt: "",
  });

  installFetch((call) => {
    assert(call.url === "https://custom.mimo/v1/chat/completions", "MiMo should call the configured endpoint");
    assert(call.init.headers["api-key"] === "tp-mimo-test", "MiMo should send api-key header");
    assert(call.body.model === "mimo-v2.5-tts", "MiMo should send model");
    assert(call.body.audio.format === "wav", "MiMo should request wav audio");
    assert(call.body.audio.voice === "mimo_default", "MiMo should send voice");
    return jsonResponse({ choices: [{ message: { audio: { data: "bWltby1hdWRpbw==" } } }] });
  });

  const mimoAudio = await mimo.synthesizeSpeech("Hello MiMo", {
    model: "mimo-v2.5-tts",
    voice: "mimo_default",
    format: "wav",
    playbackRate: 1,
    tokenPlanBaseUrl: "https://custom.mimo/v1",
  });
  assert(mimoAudio === "bWltby1hdWRpbw==", "MiMo should return base64 audio");

  installFetch(() => jsonResponse({ error: { message: "mimo error", code: "400" } }));
  await expectRejects(
    () =>
      mimo.synthesizeSpeech("Hello MiMo", {
        model: "mimo-v2.5-tts",
        voice: "mimo_default",
        format: "wav",
        playbackRate: 1,
      }),
    (error) => error.name === "TTSApiError" && error.message.includes("mimo error"),
    "MiMo should reject API error payloads",
  );

  const controller = new AbortController();
  controller.abort();
  await expectRejects(
    () =>
      mimo.synthesizeSpeech(
        "Hello MiMo",
        {
          model: "mimo-v2.5-tts",
          voice: "mimo_default",
          format: "wav",
          playbackRate: 1,
        },
        controller.signal,
      ),
    (error) => error.name === "TTSApiError" && error.code === -7,
    "MiMo should reject pre-aborted synthesis",
  );
}

async function verifyOpenAI() {
  setPreferences({
    openaiApiKey: "sk-openai-test",
    openaiModel: "gpt-4o-mini-tts",
    openaiVoice: "alloy",
    openaiResponseFormat: "mp3",
    openaiPlaybackRate: "1",
    openaiInstructions: "Speak clearly.",
  });

  installFetch((call) => {
    assert(call.url === "https://api.openai.com/v1/audio/speech", "OpenAI should call audio/speech endpoint");
    assert(call.init.headers.Authorization === "Bearer sk-openai-test", "OpenAI should send bearer auth");
    assert(call.body.model === "gpt-4o-mini-tts", "OpenAI should send model");
    assert(call.body.voice === "alloy", "OpenAI should send voice");
    assert(call.body.response_format === "mp3", "OpenAI should send response_format");
    assert(call.body.instructions === "Speak clearly.", "OpenAI should send supported-model instructions");
    return binaryResponse("openai-audio");
  });

  const openAIAudio = await openai.synthesizeSpeech("Hello OpenAI", {
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    instructions: "Speak clearly.",
    format: "mp3",
    playbackRate: 1,
  });
  assert(openAIAudio === Buffer.from("openai-audio").toString("base64"), "OpenAI should return base64 audio");

  installFetch((call) => {
    assert(!("instructions" in call.body), "OpenAI should omit instructions for legacy TTS models");
    return binaryResponse("legacy-openai-audio");
  });
  await openai.synthesizeSpeech("Hello OpenAI", {
    model: "tts-1",
    voice: "alloy",
    instructions: "Should not be sent",
    format: "mp3",
    playbackRate: 1,
  });

  installFetch(() => jsonResponse({ error: { message: "openai error", type: "bad_request" } }, 400, "Bad Request"));
  await expectRejects(
    () =>
      openai.synthesizeSpeech("Hello OpenAI", {
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        format: "mp3",
        playbackRate: 1,
      }),
    (error) => error.name === "TTSApiError" && error.message.includes("openai error"),
    "OpenAI should reject API error payloads",
  );

  const controller = new AbortController();
  controller.abort();
  await expectRejects(
    () =>
      openai.synthesizeSpeech(
        "Hello OpenAI",
        {
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          format: "mp3",
          playbackRate: 1,
        },
        controller.signal,
      ),
    (error) => error.name === "TTSApiError" && error.code === -7,
    "OpenAI should reject pre-aborted synthesis",
  );
}
