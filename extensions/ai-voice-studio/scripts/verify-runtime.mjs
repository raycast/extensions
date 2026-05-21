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

const searchableFiles = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  ...fs
    .readdirSync(path.join(root, "src"), { recursive: true })
    .filter((entry) => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
    .map((entry) => path.join("src", entry)),
];

const deprecatedPatterns = [
  "Configure Voice Providers",
  "minimax-tts.pid",
  "minimax-tts.stop",
  "ai-voice-studio:provider-settings",
];

for (const file of searchableFiles) {
  const source = read(file);
  for (const pattern of deprecatedPatterns) {
    check(!source.includes(pattern), `${file} still contains deprecated runtime surface: ${pattern}`);
  }
  check(!source.includes("Open Command Preferences"), `${file} should not route users to command preferences for setup`);
  check(!source.includes("openCommandPreferences"), `${file} should not use command preferences after setup centralization`);
}

for (const entry of pkg.commands) {
  const tsx = path.join(root, "src", `${entry.name}.tsx`);
  const ts = path.join(root, "src", `${entry.name}.ts`);
  check(fs.existsSync(tsx) || fs.existsSync(ts), `Missing command entry point for ${entry.name}`);
  check(entry.icon === pkg.icon, `${entry.name} should use the shared extension icon ${pkg.icon}`);
}
check(pkg.icon === "command-icon.png", "Extension should use the shared AI Voice Studio command icon");
check(!fs.existsSync(path.join(root, "assets", "mimo-icon.png")), "Source assets should not include stale MiMo command icon");
check(!fs.existsSync(path.join(root, "assets", "mimo-icon@dark.png")), "Source assets should not include stale MiMo dark command icon");

for (const name of [
  "quick-read",
  "setup-voice-defaults",
  "test-voice-setup",
  "mimo-quick-read",
  "openai-quick-read",
  "stop-reading",
  "speed-up-reading",
  "slow-down-reading",
]) {
  check(Boolean(command(name)), `Missing required command ${name}`);
}
check(
  command("mimo-status")?.icon === command("playback-status")?.icon,
  "MiniMax and MiMo menu-bar status commands should use the same manifest icon",
);

check(!command("configure-providers"), "Standalone configure-providers command should not be in manifest");
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
if (fs.existsSync(path.join(root, "dist"))) {
  const staleDistFiles = fs
    .readdirSync(path.join(root, "dist"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.includes("configure-providers"));
  check(staleDistFiles.length === 0, `dist contains stale configure-providers artifacts: ${staleDistFiles.join(", ")}`);
  const staleMimoIconFiles = fs
    .readdirSync(path.join(root, "dist"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.includes("mimo-icon"));
  check(staleMimoIconFiles.length === 0, `dist contains stale MiMo icon artifacts: ${staleMimoIconFiles.join(", ")}`);
}

const extensionPrefs = new Set(pkg.preferences.map((pref) => pref.name));
for (const name of ["tokenPlanKey", "openPlatformApiKey", "mimoApiKey", "openaiApiKey"]) {
  check(extensionPrefs.has(name), `Missing extension preference ${name}`);
}
check(!extensionPrefs.has("defaultProvider"), "Default provider should live in Setup Voice Defaults, not the sidebar");
check(!extensionPrefs.has("authMode"), "MiniMax auth mode should live in Setup Voice Defaults, not the sidebar");
check(!extensionPrefs.has("region"), "MiniMax region should live in focused setup, not the sidebar");
check(!extensionPrefs.has("mimoTokenPlanBaseUrl"), "MiMo base URL should live in focused setup, not the sidebar");
check(pkg.preferences.length <= 4, "Extension-level preferences should stay short enough for one-screen sidebar key entry");

const providerPreferenceNames = new Set([
  "minimaxModel",
  "minimaxDefaultVoice",
  "minimaxCustomDefaultVoice",
  "minimaxCustomVoiceIds",
  "minimaxLanguageBoost",
  "minimaxSpeechRate",
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
check(quickRead.includes('launchCommand({ name: "mimo-quick-read"'), "Shared Quick Read should launch MiMo command");
check(quickRead.includes('launchCommand({ name: "openai-quick-read"'), "Shared Quick Read should launch OpenAI command");
check(quickRead.includes("requestExternalStop();"), "Shared Quick Read should request MiniMax stop while synthesizing");

const providerSettings = read("src/utils/provider-settings.ts");
check(
  providerSettings.includes("QUICK_SETUP_OVERRIDES_KEY") &&
    providerSettings.includes("saveProviderSettingsOverrides") &&
    providerSettings.includes("clearProviderSettingsOverrides") &&
    providerSettings.includes("authMode") &&
    providerSettings.includes("tokenPlanBaseUrl") &&
    providerSettings.includes("normalizeMiniMaxRegion"),
  "Provider settings should support the one-page Quick Setup override layer",
);
check(read("src/setup-voice-defaults.tsx").includes("ProviderSetupForm"), "Setup command should render provider setup form");
const providerSetupForm = read("src/components/provider-setup-form.tsx");
check(
  providerSetupForm.includes("formVersion") && providerSetupForm.includes("key={`provider-setup-${formVersion}`"),
  "Provider setup form should not remount on every draft field edit",
);
check(
  providerSetupForm.includes("setupProvider") &&
    providerSetupForm.includes("initialProvider") &&
    providerSetupForm.includes("activeProvider === \"minimax\"") &&
    providerSetupForm.includes("activeProvider === \"mimo\"") &&
    providerSetupForm.includes("activeProvider === \"openai\"") &&
    providerSetupForm.includes("showAdvanced") &&
    providerSetupForm.includes("minimaxAuthMode") &&
    providerSetupForm.includes("minimaxRegion") &&
    providerSetupForm.includes("mimoTokenPlanBaseUrl") &&
    providerSetupForm.includes("Form.Description title=\"MiMo\"") &&
    providerSetupForm.includes("Form.Description title=\"OpenAI\"") &&
    providerSetupForm.includes("test-voice-setup"),
  "Provider setup form should expose a focused provider panel and move inactive/advanced fields out of the default sidebar view",
);
check(
  read("src/read-with-voice.tsx").includes('provider="minimax"') &&
    read("src/tts-studio.tsx").includes('provider="mimo"') &&
    read("src/openai-read-with-voice.tsx").includes('provider="openai"'),
  "Provider-specific commands should open setup focused on their own provider",
);

const testVoiceSetup = read("src/test-voice-setup.tsx");
check(testVoiceSetup.includes("getDefaultProvider()"), "Voice setup test should use the current default provider");
check(
  testVoiceSetup.includes("synthesizeMiniMax") &&
    testVoiceSetup.includes("synthesizeMimo") &&
    testVoiceSetup.includes("synthesizeOpenAI"),
  "Voice setup test should exercise real provider synthesis paths",
);
check(testVoiceSetup.includes("player.playAudio("), "Voice setup test should exercise real playback");
check(testVoiceSetup.includes("synthMs") && testVoiceSetup.includes("bytes"), "Voice setup test should report latency and audio size");
for (const file of [
  "src/tts-studio.tsx",
  "src/read-with-voice.tsx",
  "src/mimo-read-with-voice.tsx",
  "src/openai-read-with-voice.tsx",
  "src/select-voice.tsx",
  "src/mimo-select-voice.tsx",
  "src/openai-select-voice.tsx",
  "src/clone-voice.tsx",
]) {
  check(read(file).includes("OpenProviderSetupAction"), `${file} should expose the one-page setup action`);
}

const stopReading = read("src/stop-reading.tsx");
check(stopReading.includes("requestExternalStop();"), "Stop Reading should request MiniMax stop while synthesizing");
check(stopReading.includes("readPlaybackState()"), "Stop Reading should inspect MiniMax live playback state");

const audioPlayer = read("src/utils/audio-player.ts");
check(audioPlayer.includes('join(tmpdir(), "ai-voice-studio.pid")'), "PID file should be scoped to ai-voice-studio");
check(audioPlayer.includes('join(tmpdir(), "ai-voice-studio.stop")'), "Stop file should be scoped to ai-voice-studio");
check(audioPlayer.includes("export function requestExternalStop()"), "Audio player should expose external stop requests");
check(!/async playAudio[\s\S]*?clearExternalStopRequest\(\);[\s\S]*?const tempPath/.test(audioPlayer), "playAudio should not clear a pending stop request before playback");
check(audioPlayer.includes("hasStopRequestSince(playbackStartedAt)"), "playAudio should ignore stale stop markers");

const readingRunner = read("src/utils/reading-runner.ts");
check(readingRunner.includes("hasExternalStopRequest()"), "MiniMax reading runner should honor external stop requests");
check(readingRunner.includes("clearExternalStopRequest();"), "MiniMax reading runner should clear consumed stop requests");
check(readingRunner.includes("startMiniMaxSynthesisJob("), "MiniMax reading runner should abort synthesis on stop");
check(readingRunner.includes("startMiniMaxSynthesisJob("), "MiniMax reading runner should pre-synthesize the next chunk");

for (const name of ["resume-reading", "restart-reading"]) {
  const source = read(`src/${name}.tsx`);
  check(source.includes("requestExternalStop();"), `${name} should request the old MiniMax run to stop before taking over`);
  check(
    source.includes("waitForExternalStopPropagation()"),
    `${name} should wait briefly before clearing the old stop marker`,
  );
}

const miniMaxApi = read("src/api/minimax-tts.ts");
check(
  miniMaxApi.includes("signal?: AbortSignal") && miniMaxApi.includes('new TTSApiError("TTS synthesis cancelled", -7)'),
  "MiniMax TTS requests should support cancellation",
);
check(miniMaxApi.includes("/v1/t2a_v2"), "MiniMax TTS should call /v1/t2a_v2");
check(miniMaxApi.includes("stream: false"), "MiniMax TTS should use non-streaming requests");
check(miniMaxApi.includes('output_format: "hex"'), "MiniMax TTS should request hex audio output");
check(miniMaxApi.includes('Authorization: `Bearer ${apiKey}`'), "MiniMax TTS should send bearer auth");
check(miniMaxApi.includes('Buffer.from(audioHex, "hex")'), "MiniMax TTS should decode hex audio");
check(miniMaxApi.includes("baseResp.status_code !== 0"), "MiniMax TTS should validate base_resp status");

const miniMaxSynthesis = read("src/utils/minimax-synthesis.ts");
check(miniMaxSynthesis.includes("hasExternalStopRequest()"), "MiniMax synthesis helper should poll external stop requests");
check(miniMaxSynthesis.includes("controller.abort()"), "MiniMax synthesis helper should abort in-flight fetches on stop");
const miniMaxVoicePicker = read("src/read-with-voice.tsx");
check(miniMaxVoicePicker.includes("playReadingSession("), "MiniMax voice picker should share the lookahead runner");
check(
  miniMaxVoicePicker.includes("waitForExternalStopPropagation()"),
  "MiniMax voice picker should let old synthesis observe stop before starting over",
);
check(read("src/select-voice.tsx").includes("player.signal"), "MiniMax preview synthesis should be cancellable");

const pipelineLookahead = read("scripts/verify-pipeline-lookahead.mjs");
check(
  pipelineLookahead.includes("verifyMiniMaxReadingRunner"),
  "Pipeline lookahead verification should cover MiniMax reading runner",
);
check(
  pipelineLookahead.includes("verifyMiniMaxLookaheadSpeedInvalidation"),
  "Pipeline lookahead verification should cover MiniMax speed-change invalidation",
);
check(
  pipelineLookahead.includes("verifyMiniMaxLookaheadCancellationOnStop"),
  "Pipeline lookahead verification should cover MiniMax stop cancellation",
);
check(
  pipelineLookahead.includes("verifyPipelineStopsBeforeNextPlayback"),
  "Pipeline lookahead verification should cover MiMo/OpenAI stop cancellation",
);

const mimoPipeline = read("src/utils/mimo-pipelined-reading.ts");
const openaiPipeline = read("src/utils/openai-pipelined-reading.ts");
check(mimoPipeline.includes("runPipeline("), "MiMo should synthesize the next chunk while playing current audio");
check(openaiPipeline.includes("runPipeline("), "OpenAI should synthesize the next chunk while playing current audio");

const mimoApi = read("src/api/mimo-tts.ts");
check(mimoApi.includes("/chat/completions"), "MiMo TTS should call chat/completions");
check(mimoApi.includes('"api-key": apiKey'), "MiMo TTS should send token-plan api-key header");
check(mimoApi.includes("choices?.[0]?.message?.audio?.data"), "MiMo TTS should read audio data from choices message");
check(mimoApi.includes("signal?.addEventListener(\"abort\""), "MiMo TTS should support cancellation");
check(mimoApi.includes("formatApiError"), "MiMo TTS should surface API error details");
check(mimoApi.includes("options.tokenPlanBaseUrl"), "MiMo TTS should read its base URL from focused setup options");

const openaiApi = read("src/api/openai-tts.ts");
check(openaiApi.includes("/audio/speech"), "OpenAI TTS should call /audio/speech");
check(openaiApi.includes('Authorization: `Bearer ${apiKey}`'), "OpenAI TTS should send bearer auth");
check(openaiApi.includes("response_format: options.format"), "OpenAI TTS should send response_format");
check(openaiApi.includes("Buffer.from(await response.arrayBuffer())"), "OpenAI TTS should decode binary audio");
check(openaiApi.includes("supportsInstructions(options.model)"), "OpenAI TTS should only send instructions when the model supports it");
check(openaiApi.includes("signal?.addEventListener(\"abort\""), "OpenAI TTS should support cancellation");

const liveSmoke = read("scripts/verify-live-smoke.mjs");
check(liveSmoke.includes('process.env[LIVE_FLAG] !== "1"'), "Live smoke should be opt-in");
check(liveSmoke.includes("loadProviderEnvFiles"), "Live smoke should load provider keys from env files");
check(!liveSmoke.includes('"AI_VOICE_STUDIO_LIVE",'), "Live smoke should not enable itself from env files");
check(liveSmoke.includes("sanitizeError"), "Live smoke should sanitize provider failures");
check(liveSmoke.includes("AI_VOICE_STUDIO_PLAY"), "Live smoke should keep audio playback explicitly opt-in");
check(liveSmoke.includes("AI_VOICE_STUDIO_KEEP_AUDIO"), "Live smoke should only keep audio files explicitly");
check(liveSmoke.includes("parseMaxMs"), "Live smoke should validate latency thresholds");
check(liveSmoke.includes("saveSetupOverrides"), "Live smoke should exercise the focused setup override layer");
check(liveSmoke.includes("buildOptionsFromPrefs"), "Live smoke should synthesize with provider options from setup");
check(liveSmoke.includes("AudioPlayer"), "Live smoke playback should exercise the shared AudioPlayer wrapper");
check(liveSmoke.includes("playbackMs"), "Live smoke should report playback latency when playback is enabled");
check(liveSmoke.includes("totalMs"), "Live smoke should report total provider/playback latency");
check(liveSmoke.includes("AudioPlayer playback exceeded"), "Live smoke should bound playback duration");
check(
  liveSmoke.includes("tokenPlanBaseUrl") && liveSmoke.includes("MIMO_TOKEN_PLAN_BASE_URL"),
  "Live smoke should pass the configured MiMo base URL into synthesis options",
);

const liveEnv = read("scripts/verify-live-env.mjs");
check(liveEnv.includes("summarizeProviderKeyStatus"), "Live env verifier should report provider key readiness");
check(liveEnv.includes("No provider key values are printed"), "Live env verifier should not print provider key values");

const liveSmokeGuardrails = read("scripts/verify-live-smoke-guardrails.mjs");
check(liveSmokeGuardrails.includes("--import"), "Live smoke guardrails should preload mocked fetch");
check(
  liveSmokeGuardrails.includes("OPENAI_RESPONSE_FORMAT") && liveSmokeGuardrails.includes("response_format"),
  "Live smoke guardrails should verify setup-driven OpenAI response format",
);
check(
  liveSmokeGuardrails.includes("synthMs") && liveSmokeGuardrails.includes("totalMs"),
  "Live smoke guardrails should verify latency reporting",
);
check(
  liveSmokeGuardrails.includes("AI_VOICE_STUDIO_PLAY") &&
    liveSmokeGuardrails.includes("playbackMs") &&
    liveSmokeGuardrails.includes("afplay"),
  "Live smoke guardrails should verify mocked playback through AudioPlayer",
);

const providerEnv = read("scripts/verify-provider-env.mjs");
check(providerEnv.includes("AI_VOICE_STUDIO_LIVE=1"), "Provider env verifier should test ignored live flags");
check(providerEnv.includes("Sanitized message should not include secret"), "Provider env verifier should test redaction");
check(providerEnv.includes("MINIMAX_API_KEY"), "Provider env verifier should cover legacy MiniMax API key aliases");

const localPlayback = read("scripts/verify-local-playback.mjs");
check(localPlayback.includes("makeSilentWavBase64"), "Local playback smoke should use generated silent WAV audio");
check(localPlayback.includes("AudioPlayer"), "Local playback smoke should exercise the shared AudioPlayer wrapper");
check(localPlayback.includes("maxPlaybackMs"), "Local playback smoke should enforce a basic latency threshold");
check(
  localPlayback.includes("writeVerificationEvidence") && read("package.json").includes("write-verification-evidence.mjs"),
  "Local verification should record direct-run evidence for completion audit",
);

const goalVerifier = read("scripts/verify-goal.mjs");
check(
  goalVerifier.includes("readFreshVerificationEvidence") &&
    goalVerifier.includes("needsDirectRun") &&
    goalVerifier.includes("local-verify") &&
    goalVerifier.includes("local-playback"),
  "Goal verifier should consume fresh direct-run evidence instead of misclassifying parent-sensitive checks",
);

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

check(read("src/utils/text-chunker.ts").includes("const MAX_CHARS = 1400"), "MiniMax chunks should stay small for first playback latency");
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
        "clean build output",
        "deprecated runtime surfaces",
        "provider preference split",
        "one-page setup override",
        "shared provider routing",
        "MiniMax stop while synthesizing",
        "MiniMax cancellable synthesis",
        "MiniMax resume/restart takeover",
        "stale stop marker handling",
        "provider API contracts",
        "provider env safety",
        "live smoke guardrails",
        "local silent playback smoke",
        "shared speed command fallback",
        "MiniMax/MiMo/OpenAI lookahead playback",
        "chunk size limits",
      ],
    },
    null,
    2,
  ),
);
