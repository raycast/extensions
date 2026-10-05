import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function command(name) {
  return pkg.commands.find((entry) => entry.name === name);
}

for (const entry of pkg.commands) {
  const tsx = path.join(root, "src", `${entry.name}.tsx`);
  const ts = path.join(root, "src", `${entry.name}.ts`);
  check(fs.existsSync(tsx) || fs.existsSync(ts), `Missing command entry point for ${entry.name}`);
  check(entry.icon === pkg.icon, `${entry.name} should use the shared extension icon ${pkg.icon}`);
}

check(pkg.icon === "command-icon.png", "Extension should use the shared AI Voice Studio command icon");
check(!command("configure-providers"), "Standalone configure-providers command should not be in manifest");

for (const name of [
  "quick-read",
  "setup-voice-defaults",
  "test-voice-setup",
  "qwen-quick-read",
  "qwen-read-with-voice",
  "qwen-select-voice",
  "qwen-status",
  "mimo-quick-read",
  "mimo-read-with-voice",
  "mimo-select-voice",
  "mimo-status",
  "openai-quick-read",
  "openai-read-with-voice",
  "openai-select-voice",
  "openai-status",
  "stop-reading",
  "speed-up-reading",
  "slow-down-reading",
]) {
  check(Boolean(command(name)), `Missing required command ${name}`);
}

for (const removedCommand of [
  "read-with-voice",
  "select-voice",
  "clone-voice",
  "playback-status",
  "resume-reading",
  "restart-reading",
]) {
  check(!command(removedCommand), `Retired provider command should not be in manifest: ${removedCommand}`);
}

for (const scriptName of [
  "verify",
  "verify:runtime",
  "verify:audio-player",
  "verify:fast-paths",
  "verify:live-env",
  "verify:local-playback",
  "verify:provider-contracts",
  "verify:provider-settings",
  "verify:test-voice-setup",
  "verify:live-smoke-guardrails",
  "verify:pipeline-lookahead",
  "verify:provider-env",
  "verify:live-smoke",
  "prebuild",
]) {
  check(Boolean(pkg.scripts?.[scriptName]), `Missing package script ${scriptName}`);
}

const extensionPrefs = new Set(pkg.preferences.map((pref) => pref.name));
for (const name of ["mimoApiKey", "openaiApiKey", "dashscopeApiKey"]) {
  check(extensionPrefs.has(name), `Missing extension preference ${name}`);
}
check(!extensionPrefs.has("minimaxApiKey"), "MiniMax API key should not be exposed in extension preferences");
check(!extensionPrefs.has("defaultProvider"), "Default provider should live in Setup Voice Defaults, not the sidebar");
check(!extensionPrefs.has("mimoTokenPlanBaseUrl"), "MiMo base URL should live in focused setup, not the sidebar");
check(pkg.preferences.length <= 3, "Extension-level preferences should stay focused on API keys");

const providerPreferenceNames = new Set([
  "qwenModel",
  "qwenVoice",
  "qwenLanguageType",
  "qwenPlaybackRate",
  "qwenInstructions",
  "qwenBaseUrl",
  "mimoModel",
  "mimoDefaultVoice",
  "mimoSpeechRate",
  "mimoStylePrompt",
  "mimoTokenPlanBaseUrl",
  "openaiModel",
  "openaiVoice",
  "openaiResponseFormat",
  "openaiPlaybackRate",
  "openaiInstructions",
]);

for (const entry of pkg.commands) {
  for (const pref of entry.preferences ?? []) {
    check(!providerPreferenceNames.has(pref.name), `${entry.name} should not expose provider defaults in command preferences`);
  }
}

const quickRead = read("src/quick-read.tsx");
check(quickRead.includes('qwen: "qwen-quick-read"'), "Shared Quick Read should launch Qwen-TTS command");
check(!quickRead.toLowerCase().includes("minimax"), "Shared Quick Read should not launch MiniMax command");
check(quickRead.includes('mimo: "mimo-quick-read"'), "Shared Quick Read should launch MiMo command");
check(quickRead.includes('openai: "openai-quick-read"'), "Shared Quick Read should launch OpenAI command");

const providerSettings = read("src/utils/provider-settings.ts");
check(
  providerSettings.includes('defaultProvider: "qwen"') &&
    providerSettings.includes("getQwenSettings") &&
    providerSettings.includes("getMimoSettings") &&
    providerSettings.includes("getOpenAISettings") &&
    providerSettings.includes("normalizeQwenRegion") &&
    providerSettings.includes("normalizeQwenLanguageType") &&
    !providerSettings.toLowerCase().includes("minimax"),
  "Provider settings should default to Qwen-TTS and expose all current provider setup blocks",
);

const providerSetupForm = read("src/components/provider-setup-form.tsx");
check(
  providerSetupForm.includes('activeProvider === "qwen"') &&
    !providerSetupForm.toLowerCase().includes("minimax") &&
    providerSetupForm.includes("qwenRegion") &&
    providerSetupForm.includes("qwenLanguageType") &&
    providerSetupForm.includes("qwenInstructions") &&
    providerSetupForm.includes("qwenOptimizeInstructions") &&
    providerSetupForm.includes('Form.Description title="Qwen-TTS"') &&
    providerSetupForm.includes('Form.Description title="MiMo"') &&
    providerSetupForm.includes('Form.Description title="OpenAI"') &&
    providerSetupForm.includes("test-voice-setup"),
  "Provider setup form should expose focused Qwen-TTS, MiMo, and OpenAI panels",
);

check(read("src/qwen-read-with-voice.tsx").includes('provider="qwen"'), "Qwen command should focus Qwen setup");
check(!fs.existsSync(path.join(root, "src/minimax-read-with-voice.tsx")), "MiniMax command should be removed");
check(read("src/tts-studio.tsx").includes('provider="mimo"'), "MiMo command should focus MiMo setup");
check(read("src/openai-read-with-voice.tsx").includes('provider="openai"'), "OpenAI command should focus OpenAI setup");

const testVoiceSetup = read("src/test-voice-setup.tsx");
check(testVoiceSetup.includes("getDefaultProvider()"), "Voice setup test should use the current default provider");
check(
  testVoiceSetup.includes("synthesizeQwen") &&
    testVoiceSetup.includes("synthesizeMimo") &&
    testVoiceSetup.includes("synthesizeOpenAI") &&
    !testVoiceSetup.includes("synthesizeMinimax"),
  "Voice setup test should exercise real provider synthesis paths",
);
check(testVoiceSetup.includes("player.playAudio("), "Voice setup test should exercise real playback");
check(testVoiceSetup.includes("synthMs") && testVoiceSetup.includes("bytes"), "Voice setup test should report latency and audio size");

const stopReading = read("src/stop-reading.tsx");
check(stopReading.includes("requestQwenPlaybackStop"), "Stop Reading should request Qwen-TTS stop");
check(stopReading.includes("getQwenNowPlaying"), "Stop Reading should inspect Qwen-TTS live playback state");
check(!stopReading.toLowerCase().includes("minimax"), "Stop Reading should not inspect MiniMax playback state");

const audioPlayer = read("src/utils/audio-player.ts");
check(audioPlayer.includes('join(tmpdir(), "ai-voice-studio.pid")'), "PID file should be scoped to ai-voice-studio");
check(audioPlayer.includes('join(tmpdir(), "ai-voice-studio.stop")'), "Stop file should be scoped to ai-voice-studio");
check(audioPlayer.includes("export function requestExternalStop()"), "Audio player should expose external stop requests");
check(audioPlayer.includes("hasStopRequestSince(playbackStartedAt)"), "playAudio should ignore stale stop markers");

const qwenApi = read("src/api/qwen-tts.ts");
check(
    qwenApi.includes("/services/aigc/multimodal-generation/generation") &&
    qwenApi.includes("language_type") &&
    qwenApi.includes("optimize_instructions") &&
    qwenApi.includes("audio?.url") &&
    qwenApi.includes("Buffer.from(await response.arrayBuffer())") &&
    qwenApi.includes("dashscopeApiKey") &&
    qwenApi.includes("signal?.addEventListener(\"abort\""),
  "Qwen-TTS API should use DashScope generation endpoint, language_type, URL fallback, shared key, and cancellation",
);

check(!fs.existsSync(path.join(root, "src/api/minimax-tts.ts")), "MiniMax HTTP TTS client should be removed");
check(!fs.existsSync(path.join(root, "src/api/minimax-tts-realtime.ts")), "MiniMax realtime TTS client should be removed");

const mimoApi = read("src/api/mimo-tts.ts");
check(mimoApi.includes("/chat/completions"), "MiMo TTS should call chat/completions");
check(mimoApi.includes('"api-key": apiKey'), "MiMo TTS should send token-plan api-key header");
check(mimoApi.includes("choices?.[0]?.message?.audio?.data"), "MiMo TTS should read audio data from choices message");
check(mimoApi.includes("signal?.addEventListener(\"abort\""), "MiMo TTS should support cancellation");
check(mimoApi.includes("options.tokenPlanBaseUrl"), "MiMo TTS should read its base URL from focused setup options");

const openaiApi = read("src/api/openai-tts.ts");
check(openaiApi.includes("/audio/speech"), "OpenAI TTS should call /audio/speech");
check(openaiApi.includes('Authorization: `Bearer ${apiKey}`'), "OpenAI TTS should send bearer auth");
check(openaiApi.includes("response_format: options.format"), "OpenAI TTS should send response_format");
check(openaiApi.includes("Buffer.from(await response.arrayBuffer())"), "OpenAI TTS should decode binary audio");
check(openaiApi.includes("supportsInstructions(options.model)"), "OpenAI TTS should only send instructions when supported");
check(openaiApi.includes("signal?.addEventListener(\"abort\""), "OpenAI TTS should support cancellation");

const liveSmoke = read("scripts/verify-live-smoke.mjs");
check(liveSmoke.includes('process.env[LIVE_FLAG] !== "1"'), "Live smoke should be opt-in");
check(liveSmoke.includes("loadProviderEnvFiles"), "Live smoke should load provider keys from env files");
check(liveSmoke.includes("sanitizeError"), "Live smoke should sanitize provider failures");
check(liveSmoke.includes("qwen") && liveSmoke.includes("DASHSCOPE_API_KEY"), "Live smoke should cover Qwen-TTS with DashScope");
check(liveSmoke.includes("AI_VOICE_STUDIO_PLAY"), "Live smoke should keep audio playback explicitly opt-in");
check(liveSmoke.includes("AI_VOICE_STUDIO_KEEP_AUDIO"), "Live smoke should only keep audio files explicitly");
check(liveSmoke.includes("tokenPlanBaseUrl") && liveSmoke.includes("MIMO_TOKEN_PLAN_BASE_URL"), "Live smoke should pass MiMo base URL");

const providerEnv = read("scripts/verify-provider-env.mjs");
check(providerEnv.includes("AI_VOICE_STUDIO_LIVE=1"), "Provider env verifier should test ignored live flags");
check(providerEnv.includes("DASHSCOPE_API_KEY"), "Provider env verifier should cover DashScope key loading");
check(providerEnv.includes("Sanitized message should not include secret"), "Provider env verifier should test redaction");

for (const file of ["src/qwen-speed-up.tsx", "src/qwen-speed-down.tsx"]) {
  const source = read(file);
  check(!source.includes("getQwenSettings"), `${file} should not read isolated Qwen command preferences`);
  check(source.includes("SPEED_NORMAL"), `${file} should use a stable normal-speed fallback`);
}

for (const file of ["src/mimo-speed-up.tsx", "src/mimo-speed-down.tsx"]) {
  const source = read(file);
  check(!source.includes("getMimoSettings"), `${file} should not read isolated MiMo command preferences`);
  check(source.includes("SPEED_NORMAL"), `${file} should use a stable normal-speed fallback`);
}

for (const file of ["src/openai-speed-up.tsx", "src/openai-speed-down.tsx"]) {
  const source = read(file);
  check(!source.includes("getOpenAISettings"), `${file} should not read isolated OpenAI command preferences`);
  check(source.includes("SPEED_NORMAL"), `${file} should use a stable normal-speed fallback`);
}

check(
  read("src/utils/qwen-text-chunker.ts").includes("QWEN_TEXT_CHUNK_LIMIT"),
  "Qwen-TTS chunks should respect char budget",
);
check(!fs.existsSync(path.join(root, "src/utils/minimax-text-chunker.ts")), "MiniMax chunker should be removed");
check(read("src/utils/mimo-text-chunker.ts").includes("const MAX_BYTES = 4096"), "MiMo chunks should respect byte budget");
check(read("src/utils/openai-text-chunker.ts").includes("const MAX_CHARS = 1800"), "OpenAI chunks should respect char budget");

if (failures.length > 0) {
  console.error("Runtime verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      commands: pkg.commands.length,
      extensionPreferences: pkg.preferences.length,
      checked: [
        "manifest entry points",
        "provider preference split",
        "one-page setup override",
        "shared provider routing",
        "provider API contracts",
        "provider env safety",
        "live smoke guardrails",
        "shared speed command fallback",
        "Qwen-TTS/MiMo/OpenAI lookahead playback",
        "chunk size limits",
      ],
    },
    null,
    2,
  ),
);
