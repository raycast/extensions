import path from "node:path";
import { createTsLoader } from "./lib/ts-loader.mjs";

const root = process.cwd();

await verifyProvider("qwen", {
  expectedAudio: "qwen-audio",
  expectedFormat: "wav",
  expectedRate: 1,
});
await verifyProvider("mimo", {
  expectedAudio: "mimo-audio",
  expectedFormat: "wav",
  expectedRate: 1.25,
});
await verifyProvider("openai", {
  expectedAudio: "openai-audio",
  expectedFormat: "wav",
  expectedRate: 1.5,
});
await verifyStoppedAfterSynthesis();
await verifyStoppedAfterPlayback();
await verifyCredentialFailureAction();
await verifySlowLatencyWarning();

console.log(
  JSON.stringify(
    {
      checked: [
        "Test Voice Setup routes to the selected default provider",
        "Test Voice Setup plays returned provider audio with the expected format and rate",
        "Test Voice Setup reports user stops without a false success",
        "Test Voice Setup surfaces API-key failures with the API-key preferences action",
        "Test Voice Setup reports slow provider/playback latency without a false failure",
      ],
    },
    null,
    2,
  ),
);

async function verifyProvider(provider, expected) {
  const events = [];
  const mod = loadCommand(provider, events);

  await mod.default();

  assert(events.includes(`provider:${provider}`), `${provider} should be the selected provider`);
  assert(events.includes(`synth:${provider}`), `${provider} synthesis should be called`);
  assert(
    events.includes(`play:${expected.expectedAudio}:${expected.expectedFormat}:${expected.expectedRate}`),
    `${provider} audio should be played with expected format and rate`,
  );
  assert(events.includes("qwen-stop:request"), `${provider} test should request any old Qwen-TTS run to stop`);
  assert(events.includes("mimo-stop:request"), `${provider} test should request any old MiMo run to stop`);
  assert(events.includes("openai-stop:request"), `${provider} test should request any old OpenAI run to stop`);
  assert(events.includes("qwen-state:clear"), `${provider} test should clear stale Qwen-TTS now-playing state`);
  assert(events.includes("mimo-state:clear"), `${provider} test should clear stale MiMo now-playing state`);
  assert(events.includes("openai-state:clear"), `${provider} test should clear stale OpenAI now-playing state`);
  assert(
    events.some((event) => event.startsWith(`hud:Voice test OK · ${labelProvider(provider)}`)),
    `${provider} should report a successful voice test`,
  );
}

async function verifyStoppedAfterSynthesis() {
  const events = [];
  const mod = loadCommand("qwen", events, { stoppedAfterSynthesis: true });

  await mod.default();

  assert(events.includes("synth:qwen"), "Stopped-after-synthesis test should synthesize first");
  assert(!events.some((event) => event.startsWith("play:")), "Stopped-after-synthesis test should not play audio");
  assert(events.includes("toast:title:Voice test stopped"), "Stopped-after-synthesis test should report stopped");
  assert(
    !events.some((event) => event.startsWith("hud:Voice test OK")),
    "Stopped-after-synthesis test should not report success",
  );
  assert(events.includes("player:cleanup"), "Stopped-after-synthesis test should cleanup the player");
}

async function verifyStoppedAfterPlayback() {
  const events = [];
  const mod = loadCommand("openai", events, { stopDuringPlay: true });

  await mod.default();

  assert(events.includes("synth:openai"), "Stopped-after-playback test should synthesize first");
  assert(
    events.includes("play:openai-audio:wav:1.5"),
    "Stopped-after-playback test should start playback before reporting stopped",
  );
  assert(events.includes("toast:title:Voice test stopped"), "Stopped-after-playback test should report stopped");
  assert(
    !events.some((event) => event.startsWith("hud:Voice test OK")),
    "Stopped-after-playback test should not report success",
  );
  assert(events.includes("player:cleanup"), "Stopped-after-playback test should cleanup the player");
}

async function verifyCredentialFailureAction() {
  const events = [];
  const mod = loadCommand("openai", events, {
    openaiError: new Error("OpenAI API key is required. Add it in extension preferences."),
  });

  await mod.default();

  assert(events.includes("toast:title:Voice setup test failed"), "Credential failure should update the toast title");
  assert(
    events.includes("toast:primary:Open API Key Preferences"),
    "Credential failure should expose API-key preferences as the primary action",
  );
  assert(!events.some((event) => event.startsWith("play:")), "Credential failure should not play audio");
}

async function verifySlowLatencyWarning() {
  const events = [];
  const originalNow = Date.now;
  let now = 0;
  Date.now = () => now;

  try {
    const mod = loadCommand("mimo", events, { synthAdvanceMs: 12_000, playAdvanceMs: 4_000 });

    await mod.default();
  } finally {
    Date.now = originalNow;
  }

  assert(events.includes("toast:title:Voice setup works, but is slow"), "Slow test should surface a slow warning");
  assert(
    events.some((event) => event.startsWith("toast:message:MiMo") && event.includes("slow synthesis")),
    "Slow synthesis should be named in the success toast",
  );
  assert(
    events.some((event) => event.startsWith("hud:Voice test slow · MiMo")),
    "Slow test should show a slow HUD instead of a normal OK HUD",
  );
  assert(!events.includes("toast:title:Voice setup test failed"), "Slow test should not become a failure");
}

function loadCommand(provider, events, options = {}) {
  let currentPlayer = null;
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  const providerFile = path.join(root, "src/utils/provider.ts");
  const qwenApiFile = path.join(root, "src/api/qwen-tts.ts");
  const mimoApiFile = path.join(root, "src/api/mimo-tts.ts");
  const openAIApiFile = path.join(root, "src/api/openai-tts.ts");
  const qwenPrefsFile = path.join(root, "src/utils/qwen-voice-preferences.ts");
  const mimoPrefsFile = path.join(root, "src/utils/mimo-voice-preferences.ts");
  const openAIPrefsFile = path.join(root, "src/utils/openai-voice-preferences.ts");
  const qwenVoicesFile = path.join(root, "src/constants/qwen-tts-voices.ts");
  const mimoVoicesFile = path.join(root, "src/constants/mimo-voices.ts");
  const openAIVoicesFile = path.join(root, "src/constants/openai-voices.ts");
  const qwenPlaybackFile = path.join(root, "src/utils/qwen-playback-state.ts");
  const mimoPlaybackFile = path.join(root, "src/utils/mimo-playback-state.ts");
  const openAIPlaybackFile = path.join(root, "src/utils/openai-playback-state.ts");

  const raycastApiStub = {
    Icon: { Gauge: "gauge", Key: "key" },
    LaunchType: { UserInitiated: "userInitiated" },
    Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
    launchCommand: async ({ name }) => events.push(`launch:${name}`),
    openExtensionPreferences: async () => events.push("open:preferences"),
    showHUD: async (message) => events.push(`hud:${message}`),
    showToast: async (toast) => {
      events.push(`toast:${toast.title}`);
      const state = { ...toast };
      return new Proxy(state, {
        set(target, property, value) {
          target[property] = value;
          if (property === "title") {
            events.push(`toast:title:${String(value)}`);
          } else if (property === "message") {
            events.push(`toast:message:${String(value)}`);
          } else if (property === "primaryAction" && value?.title) {
            events.push(`toast:primary:${value.title}`);
          }
          return true;
        },
      });
    },
  };

  const overrides = {
    "@raycast/api": raycastApiStub,
    [audioPlayerFile]: {
      AudioPlayer: class {
        signal = new AbortController().signal;
        stopped = false;
        constructor() {
          currentPlayer = this;
        }
        async playAudio(audio, format, rate) {
          events.push(`play:${audio}:${format}:${rate}`);
          nowFromOption(options.playAdvanceMs);
          if (options.stopDuringPlay) this.stopped = true;
        }
        stopPlayback() {
          this.stopped = true;
          events.push("player:stop");
        }
        isStopped() {
          return this.stopped;
        }
        cleanup() {
          events.push("player:cleanup");
        }
      },
      clearExternalStopRequest: () => events.push("external-stop:clear"),
      requestExternalStop: () => events.push("external-stop:request"),
      stopExternalPlayback: () => {
        events.push("external-playback:stop");
        return false;
      },
      waitForExternalStopPropagation: async () => events.push("external-stop:wait"),
    },
    [providerFile]: {
      getDefaultProvider: async () => {
        events.push(`provider:${provider}`);
        return provider;
      },
    },
    [qwenApiFile]: {
      getModelLabel: (model) => model,
      synthesizeSpeech: async () => {
        events.push("synth:qwen");
        nowFromOption(options.synthAdvanceMs);
        if (options.stoppedAfterSynthesis) {
          currentPlayer?.stopPlayback();
        }
        return "qwen-audio";
      },
    },
    [mimoApiFile]: {
      getModelLabel: (model) => model,
      synthesizeSpeech: async () => {
        events.push("synth:mimo");
        nowFromOption(options.synthAdvanceMs);
        if (options.stoppedAfterSynthesis) {
          currentPlayer?.stopPlayback();
        }
        return "mimo-audio";
      },
    },
    [openAIApiFile]: {
      getModelLabel: (model) => model,
      synthesizeSpeech: async () => {
        events.push("synth:openai");
        if (options.openaiError) throw options.openaiError;
        nowFromOption(options.synthAdvanceMs);
        if (options.stoppedAfterSynthesis) {
          currentPlayer?.stopPlayback();
        }
        return "openai-audio";
      },
    },
    [qwenPrefsFile]: {
      buildDefaultOptionsFromPrefs: async () => ({
        model: "qwen3-tts-flash",
        voice: "Cherry",
        format: "wav",
        languageType: "Auto",
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        playbackRate: 1,
      }),
    },
    [mimoPrefsFile]: {
      buildDefaultOptionsFromPrefs: async () => ({
        model: "mimo-v2.5-tts",
        voice: "Chloe",
        format: "wav",
        playbackRate: 1.25,
      }),
    },
    [openAIPrefsFile]: {
      buildDefaultOptionsFromPrefs: async () => ({
        model: "gpt-4o-mini-tts",
        voice: "cedar",
        format: "wav",
        playbackRate: 1.5,
      }),
    },
    [qwenVoicesFile]: {
      getVoiceById: (voice) => ({ name: voice }),
    },
    [mimoVoicesFile]: {
      getVoiceById: (voice) => ({ name: voice }),
    },
    [openAIVoicesFile]: {
      getVoiceById: (voice) => ({ name: voice }),
    },
    [qwenPlaybackFile]: {
      clearNowPlaying: async () => events.push("qwen-state:clear"),
      requestPlaybackStop: async () => events.push("qwen-stop:request"),
    },
    [mimoPlaybackFile]: {
      clearNowPlaying: async () => events.push("mimo-state:clear"),
      requestPlaybackStop: async () => events.push("mimo-stop:request"),
    },
    [openAIPlaybackFile]: {
      clearNowPlaying: async () => events.push("openai-state:clear"),
      requestPlaybackStop: async () => events.push("openai-stop:request"),
    },
  };

  const loadTs = createTsLoader({ overrides });
  return loadTs("src/test-voice-setup.tsx");
}

function nowFromOption(ms) {
  if (ms) {
    const currentNow = Date.now();
    Date.now = () => currentNow + ms;
  }
}

function labelProvider(provider) {
  if (provider === "qwen") return "Qwen-TTS";
  if (provider === "mimo") return "MiMo";
  if (provider === "openai") return "OpenAI";
  return "Qwen-TTS";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
