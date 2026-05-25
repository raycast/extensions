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

const qwen = loadTs("src/api/qwen-tts.ts");
const mimo = loadTs("src/api/mimo-tts.ts");
const openai = loadTs("src/api/openai-tts.ts");
const providerSettings = loadTs("src/utils/provider-settings.ts");

await verifyFocusedSetupOptionBuilders();
await verifyQwen();
await verifyMiMo();
await verifyOpenAI();

console.log(
  JSON.stringify(
    {
      checked: [
        "Focused setup overrides flow into provider option builders",
        "Qwen-TTS request/audio-data/audio-url/error/cancel contract",
        "MiMo request/base64/error/cancel contract",
        "OpenAI request/binary decode/error/cancel contract",
      ],
    },
    null,
    2,
  ),
);

async function verifyFocusedSetupOptionBuilders() {
  setPreferences({ dashscopeApiKey: "sk-dashscope-test" });
  await providerSettings.saveProviderSettingsOverrides({
    qwen: {
      model: "qwen3-tts-instruct-flash",
      voice: "Ethan",
      languageType: "German",
      playbackRate: "1.25",
      instructions: "Warm base",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    },
  });
  const qwenOptions = await qwen.buildOptionsFromPrefs();
  assert(qwenOptions.model === "qwen3-tts-instruct-flash", "Qwen-TTS options should use focused setup model");
  assert(qwenOptions.voice === "Ethan", "Qwen-TTS options should use focused setup voice");
  assert(qwenOptions.languageType === "German", "Qwen-TTS options should use focused setup language");
  assert(qwenOptions.playbackRate === 1.25, "Qwen-TTS options should parse focused setup playback rate");
  assert(qwenOptions.instructions?.includes("Warm base"), "Qwen-TTS options should include focused setup instructions");
  assert(
    qwenOptions.baseUrl === "https://dashscope.aliyuncs.com/api/v1",
    "Qwen-TTS options should normalize focused setup base URL",
  );

  setPreferences({ mimoApiKey: "tp-mimo-test" });
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

  setPreferences({ openaiApiKey: "sk-openai-test" });
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

async function verifyQwen() {
  setPreferences({ dashscopeApiKey: "sk-dashscope-test" });

  installFetch((call) => {
    assert(
      call.url === "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      "Qwen-TTS should call DashScope multimodal generation endpoint",
    );
    assert(call.init.method === "POST", "Qwen-TTS should use POST");
    assert(call.init.headers.Authorization === "Bearer sk-dashscope-test", "Qwen-TTS should send bearer auth");
    assert(call.body.model === "qwen3-tts-instruct-flash", "Qwen-TTS should send model");
    assert(call.body.input.voice === "Ethan", "Qwen-TTS should send voice");
    assert(call.body.input.language_type === "German", "Qwen-TTS should send language_type");
    assert(call.body.input.instructions === "Speak warmly.", "Qwen-TTS should send instruct-model instructions");
    return jsonResponse({ output: { audio: { data: "cXdlbi1hdWRpbw==" } } });
  });

  const qwenAudio = await qwen.synthesizeSpeech("Hello Qwen", {
    model: "qwen3-tts-instruct-flash",
    voice: "Ethan",
    format: "wav",
    languageType: "German",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    playbackRate: 1.25,
    instructions: "Speak warmly.",
  });
  assert(qwenAudio === "cXdlbi1hdWRpbw==", "Qwen-TTS should return base64 audio data");

  installFetch((call) => {
    if (call.url.endsWith("/generation")) {
      return jsonResponse({ output: { audio: { url: "https://example.com/qwen.wav" } } });
    }
    assert(call.url === "https://example.com/qwen.wav", "Qwen-TTS should download returned audio URL");
    return binaryResponse("qwen-url-audio");
  });

  const qwenUrlAudio = await qwen.synthesizeSpeech("Hello Qwen", {
    model: "qwen3-tts-flash",
    voice: "Cherry",
    format: "wav",
    languageType: "Chinese",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    playbackRate: 1,
  });
  assert(qwenUrlAudio === Buffer.from("qwen-url-audio").toString("base64"), "Qwen-TTS should download audio URL");

  installFetch(() => jsonResponse({ code: "InvalidParameter", message: "qwen error" }));
  await expectRejects(
    () =>
      qwen.synthesizeSpeech("Hello Qwen", {
        model: "qwen3-tts-flash",
        voice: "Cherry",
        format: "wav",
        languageType: "Chinese",
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        playbackRate: 1,
      }),
    (error) => error.name === "TTSApiError" && error.message.includes("qwen error"),
    "Qwen-TTS should reject API error payloads",
  );

  const controller = new AbortController();
  controller.abort();
  await expectRejects(
    () =>
      qwen.synthesizeSpeech(
        "Hello Qwen",
        {
          model: "qwen3-tts-flash",
          voice: "Cherry",
          format: "wav",
          languageType: "Chinese",
          baseUrl: "https://dashscope.aliyuncs.com/api/v1",
          playbackRate: 1,
        },
        controller.signal,
      ),
    (error) => error.name === "TTSApiError" && error.code === -7,
    "Qwen-TTS should reject pre-aborted synthesis",
  );
}

async function verifyMiMo() {
  setPreferences({ mimoApiKey: "tp-mimo-test" });

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
  setPreferences({ openaiApiKey: "sk-openai-test" });

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
