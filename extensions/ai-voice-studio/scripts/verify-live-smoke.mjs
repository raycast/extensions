import os from "node:os";
import path from "node:path";
import { loadProviderEnvFiles, sanitizeError } from "./lib/provider-env.mjs";
import { createTsLoader } from "./lib/ts-loader.mjs";
import { createLocalStorageStub } from "./lib/verify-helpers.mjs";

let preferences = {};
const storageStub = createLocalStorageStub();

loadProviderEnvFiles();

const LIVE_FLAG = "AI_VOICE_STUDIO_LIVE";
const PROVIDERS = parseProviders(process.env.AI_VOICE_STUDIO_PROVIDERS);
const TEXT = process.env.AI_VOICE_STUDIO_TEXT?.trim() || "AI Voice Studio live smoke test.";
const SHOULD_PLAY = process.env.AI_VOICE_STUDIO_PLAY === "1";
const SHOULD_WRITE_AUDIO = SHOULD_PLAY || process.env.AI_VOICE_STUDIO_WRITE_AUDIO === "1";
const SHOULD_KEEP_AUDIO = process.env.AI_VOICE_STUDIO_KEEP_AUDIO === "1";
let maxMs = 30000;

const raycastApiStub = {
  LocalStorage: storageStub.LocalStorage,
  getPreferenceValues() {
    return preferences;
  },
};

const loadTs = createTsLoader({ raycastApiStub });

if (process.env[LIVE_FLAG] !== "1") {
  console.error(
    [
      "Live TTS smoke test is opt-in.",
      `Set ${LIVE_FLAG}=1 and at least one provider key env var to run.`,
      "Provider keys may come from the shell, ~/.env, or project .env:",
      "- DASHSCOPE_API_KEY",
      "- MIMO_API_KEY",
      "- OPENAI_API_KEY",
      "Optional: AI_VOICE_STUDIO_PROVIDERS=qwen,mimo,openai AI_VOICE_STUDIO_PLAY=1",
      "Optional: AI_VOICE_STUDIO_MAX_MS=30000 AI_VOICE_STUDIO_KEEP_AUDIO=1",
    ].join("\n"),
  );
  process.exit(2);
}

try {
  maxMs = parseMaxMs(process.env.AI_VOICE_STUDIO_MAX_MS);
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        results: [{ provider: "all", status: "failed", error: sanitizeError(error) }],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const results = [];

for (const provider of PROVIDERS) {
  if (provider === "qwen") {
    if (!process.env.DASHSCOPE_API_KEY) {
      results.push({ provider, status: "skipped", reason: "missing DASHSCOPE_API_KEY in shell env or .env" });
      continue;
    }
    results.push(await attempt(provider, verifyQwen));
  } else if (provider === "mimo") {
    if (!process.env.MIMO_API_KEY) {
      results.push({ provider, status: "skipped", reason: "missing MIMO_API_KEY in shell env or .env" });
      continue;
    }
    results.push(await attempt(provider, verifyMiMo));
  } else if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      results.push({ provider, status: "skipped", reason: "missing OPENAI_API_KEY in shell env or .env" });
      continue;
    }
    results.push(await attempt(provider, verifyOpenAI));
  }
}

const passed = results.filter((result) => result.status === "passed");
const failed = results.filter((result) => result.status === "failed");
if (passed.length === 0 || failed.length > 0) {
  console.error(JSON.stringify({ status: "failed", results }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "passed", results }, null, 2));

async function attempt(provider, fn) {
  try {
    return await fn();
  } catch (error) {
    return {
      provider,
      status: "failed",
      error: sanitizeError(error),
    };
  }
}

function parseProviders(raw) {
  const allowed = new Set(["qwen", "mimo", "openai"]);
  const parsed = (raw || "qwen,mimo,openai")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const providers = parsed.filter((item) => allowed.has(item));
  return providers.length > 0 ? providers : ["qwen", "mimo", "openai"];
}

function parseMaxMs(raw) {
  if (raw === undefined || raw === "") return 30000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("AI_VOICE_STUDIO_MAX_MS must be a positive number of milliseconds");
  }
  return parsed;
}

function setPreferences(next) {
  preferences = next;
}

async function saveSetupOverrides(overrides) {
  const providerSettings = loadTs("src/utils/provider-settings.ts");
  await providerSettings.saveProviderSettingsOverrides(overrides);
}

async function timed(provider, format, playbackRate, fn) {
  const started = Date.now();
  const audio = await fn();
  const synthMs = Date.now() - started;
  const bytes = Buffer.from(audio, "base64").length;
  if (bytes === 0) {
    throw new Error(`${provider} returned empty audio`);
  }
  if (synthMs > maxMs) {
    throw new Error(`${provider} synthesis took ${synthMs}ms, exceeding ${maxMs}ms`);
  }

  const result = { provider, status: "passed", elapsedMs: synthMs, synthMs, bytes, format };
  if (SHOULD_WRITE_AUDIO) {
    const audioPath = path.join(os.tmpdir(), `ai-voice-studio-live-${provider}.${format}`);
    try {
      fs.writeFileSync(audioPath, Buffer.from(audio, "base64"));
      if (SHOULD_KEEP_AUDIO) {
        result.audioPath = audioPath;
      }
      if (SHOULD_PLAY) {
        const playbackStarted = Date.now();
        await playWithSharedAudioPlayer(audio, format, playbackRate, maxMs - synthMs);
        result.playbackMs = Date.now() - playbackStarted;
        result.totalMs = Date.now() - started;
        if (result.totalMs > maxMs) {
          throw new Error(`${provider} total smoke path took ${result.totalMs}ms, exceeding ${maxMs}ms`);
        }
        result.played = true;
      }
    } finally {
      if (!SHOULD_KEEP_AUDIO) {
        fs.rmSync(audioPath, { force: true });
      }
    }
  }
  result.totalMs ??= Date.now() - started;
  return result;
}

async function playWithSharedAudioPlayer(audio, format, playbackRate, timeoutMs) {
  const { AudioPlayer } = loadTs("src/utils/audio-player.ts");
  const player = new AudioPlayer();
  let timeoutId;
  try {
    await Promise.race([
      player.playAudio(audio, format, playbackRate),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          player.stopPlayback();
          reject(new Error(`AudioPlayer playback exceeded ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    player.cleanup();
  }
}

async function verifyQwen() {
  const qwen = loadTs("src/api/qwen-tts.ts");
  const model = process.env.QWEN_MODEL || "qwen3-tts-flash";
  const voice = process.env.QWEN_VOICE || "Cherry";

  setPreferences({
    dashscopeApiKey: process.env.DASHSCOPE_API_KEY,
  });
  await saveSetupOverrides({
    defaultProvider: "qwen",
    qwen: {
      model,
      voice,
      region: process.env.QWEN_REGION || "beijing",
      languageType: process.env.QWEN_LANGUAGE_TYPE || "Auto",
      playbackRate: process.env.QWEN_PLAYBACK_RATE || "1",
      instructions: process.env.QWEN_INSTRUCTIONS || "",
      optimizeInstructions: process.env.QWEN_OPTIMIZE_INSTRUCTIONS === "1",
      baseUrl: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/api/v1",
    },
  });

  const options = await qwen.buildOptionsFromPrefs();
  return timed("qwen", options.format, options.playbackRate, () => qwen.synthesizeSpeech(TEXT, options));
}

async function verifyMiMo() {
  const mimo = loadTs("src/api/mimo-tts.ts");
  const model = process.env.MIMO_MODEL || "mimo-v2.5-tts";
  const voice = process.env.MIMO_VOICE || "Chloe";
  const tokenPlanBaseUrl = process.env.MIMO_TOKEN_PLAN_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1";
  setPreferences({
    mimoApiKey: process.env.MIMO_API_KEY,
  });
  await saveSetupOverrides({
    defaultProvider: "mimo",
    mimo: {
      model,
      defaultVoice: voice,
      speechRate: process.env.MIMO_SPEECH_RATE || "0",
      stylePrompt: process.env.MIMO_STYLE_PROMPT || "",
      tokenPlanBaseUrl,
    },
  });

  const options = await mimo.buildOptionsFromPrefs();
  return timed("mimo", options.format, options.playbackRate, () => mimo.synthesizeSpeech(TEXT, options));
}

async function verifyOpenAI() {
  const openai = loadTs("src/api/openai-tts.ts");
  const format = process.env.OPENAI_RESPONSE_FORMAT === "wav" ? "wav" : "mp3";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini-tts";
  const voice = process.env.OPENAI_VOICE || "alloy";
  setPreferences({
    openaiApiKey: process.env.OPENAI_API_KEY,
  });
  await saveSetupOverrides({
    defaultProvider: "openai",
    openai: {
      model,
      voice,
      responseFormat: format,
      playbackRate: process.env.OPENAI_PLAYBACK_RATE || "1",
      instructions: process.env.OPENAI_INSTRUCTIONS || "Speak clearly and naturally.",
    },
  });

  const options = await openai.buildOptionsFromPrefs();
  return timed("openai", options.format, options.playbackRate, () => openai.synthesizeSpeech(TEXT, options));
}
