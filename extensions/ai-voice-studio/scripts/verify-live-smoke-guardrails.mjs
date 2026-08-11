import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-voice-studio-live-smoke-test-"));
const fakeBin = path.join(tempRoot, "bin");
const preloadPath = path.join(tempRoot, "mock-fetch.mjs");
const fetchLogPath = path.join(tempRoot, "fetch-log.json");
const afplayLogPath = path.join(tempRoot, "afplay-args.txt");
const liveSmokeOpenAIAudioPath = path.join(os.tmpdir(), "ai-voice-studio-live-openai.wav");
const fakeKeys = {
  dashscope: "sk-live-guard-dashscope-1234567890",
  mimo: "tp-live-guard-mimo-1234567890",
  openai: "sk-live-guard-openai-1234567890",
};
const fakeAudio = {
  qwen: Buffer.from("qwen-live-smoke-audio"),
  mimo: Buffer.from("mimo-live-smoke-audio"),
  openai: Buffer.from("openai-live-smoke-audio"),
};

fs.mkdirSync(fakeBin, { recursive: true });
fs.writeFileSync(
  path.join(fakeBin, "afplay"),
  [
    "#!/bin/sh",
    'printf "%s\\n" "$@" > "$AI_VOICE_STUDIO_GUARDRAIL_AFPLAY_LOG"',
    'if [ -n "$AI_VOICE_STUDIO_GUARDRAIL_AFPLAY_SLEEP_SECONDS" ]; then',
    '  sleep "$AI_VOICE_STUDIO_GUARDRAIL_AFPLAY_SLEEP_SECONDS"',
    "fi",
    "exit 0",
    "",
  ].join("\n"),
);
fs.chmodSync(path.join(fakeBin, "afplay"), 0o755);

fs.writeFileSync(
  preloadPath,
  [
    "import fs from 'node:fs';",
    "function appendLog(entry) {",
    "  const file = process.env.AI_VOICE_STUDIO_GUARDRAIL_FETCH_LOG;",
    "  const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];",
    "  current.push(entry);",
    "  fs.writeFileSync(file, JSON.stringify(current));",
    "}",
    "globalThis.fetch = async (url, init = {}) => {",
    "  const headers = init.headers || {};",
    "  const body = JSON.parse(String(init.body || '{}'));",
    "  appendLog({",
    "    url: String(url),",
    "    method: init.method,",
    "    authorization: headers.Authorization,",
    "    apiKey: headers['api-key'],",
    "    body,",
    "  });",
    "  if (process.env.AI_VOICE_STUDIO_GUARDRAIL_FORCE_ERROR === 'openai' && String(url).includes('/audio/speech')) {",
    "    return Response.json({ error: { message: `provider rejected ${process.env.OPENAI_API_KEY}` } }, { status: 500 });",
    "  }",
    "  const urlText = String(url);",
    "  if (urlText.includes('/services/aigc/multimodal-generation/generation')) {",
    "    return Response.json({",
    `      output: { audio: { data: ${JSON.stringify(fakeAudio.qwen.toString("base64"))} } },`,
    "    });",
    "  }",
    "  if (urlText.includes('/chat/completions')) {",
    "    return Response.json({",
    `      choices: [{ message: { audio: { data: ${JSON.stringify(fakeAudio.mimo.toString("base64"))} } } }],`,
    "    });",
    "  }",
    `  return new Response(Buffer.from(${JSON.stringify(fakeAudio.openai.toString("base64"))}, 'base64'), { status: 200 });`,
    "};",
  ].join("\n"),
);

try {
  const result = runLiveSmoke({ providers: "qwen,mimo,openai", play: false });

  assert(result.status === 0, result.stderr || result.stdout);
  assertNoSecrets(result.stdout, "Live smoke output should not print provider keys");
  assertNoSecrets(result.stderr, "Live smoke errors should not print provider keys");

  const parsed = JSON.parse(result.stdout);
  const qwen = findProviderResult(parsed, "qwen");
  const mimo = findProviderResult(parsed, "mimo");
  const openai = findProviderResult(parsed, "openai");
  assert(parsed.status === "passed", "Live smoke should pass with mocked provider audio");
  assert(qwen.status === "passed", "Qwen-TTS live smoke result should pass");
  assert(mimo.status === "passed", "MiMo live smoke result should pass");
  assert(openai.status === "passed", "OpenAI live smoke result should pass");
  assert(qwen.format === "wav", "Qwen-TTS live smoke should use setup format");
  assert(mimo.format === "wav", "MiMo live smoke should use setup format");
  assert(openai.format === "wav", "OpenAI live smoke should use setup response format");
  assert(qwen.bytes === fakeAudio.qwen.length, "Qwen-TTS live smoke should report returned audio size");
  assert(mimo.bytes === fakeAudio.mimo.length, "MiMo live smoke should report returned audio size");
  assert(openai.bytes === fakeAudio.openai.length, "OpenAI live smoke should report returned audio size");
  for (const providerResult of [qwen, mimo, openai]) {
    assert(typeof providerResult.synthMs === "number", `${providerResult.provider} should report synthMs`);
    assert(typeof providerResult.totalMs === "number", `${providerResult.provider} should report totalMs`);
    assert(
      !("playbackMs" in providerResult),
      `${providerResult.provider} should report playbackMs only when playback is enabled`,
    );
  }

  const fetchLog = readFetchLog();
  assert(fetchLog.length === 3, "Live smoke should call all three mocked provider APIs");
  const qwenFetch = findFetch(fetchLog, "/services/aigc/multimodal-generation/generation");
  const mimoFetch = findFetch(fetchLog, "/chat/completions");
  const openaiFetch = findFetch(fetchLog, "/audio/speech");
  assert(qwenFetch.authorization === `Bearer ${fakeKeys.dashscope}`, "Qwen-TTS should send configured DashScope key");
  assert(qwenFetch.body.model === "qwen3-tts-instruct-flash", "Qwen-TTS live smoke should use setup model");
  assert(qwenFetch.body.input.voice === "Ethan", "Qwen-TTS should use setup voice");
  assert(qwenFetch.body.input.language_type === "German", "Qwen-TTS should use setup language_type");
  assert(qwenFetch.body.input.instructions.includes("Guardrail Qwen."), "Qwen-TTS should use setup instructions");
  assert(qwenFetch.body.input.optimize_instructions === true, "Qwen-TTS should use optimize_instructions");
  assert(mimoFetch.url === "https://guardrail.mimo/v1/chat/completions", "MiMo should use setup base URL");
  assert(mimoFetch.apiKey === fakeKeys.mimo, "MiMo should send configured API key");
  assert(mimoFetch.body.model === "mimo-v2.5-tts", "MiMo live smoke should use setup model");
  assert(mimoFetch.body.audio.voice === "Chloe", "MiMo should use setup voice");
  assert(openaiFetch.authorization === `Bearer ${fakeKeys.openai}`, "OpenAI should send the configured API key");
  assert(openaiFetch.body.model === "gpt-4o-mini-tts", "OpenAI live smoke should use setup model");
  assert(openaiFetch.body.voice === "cedar", "OpenAI live smoke should use setup voice");
  assert(openaiFetch.body.response_format === "wav", "OpenAI live smoke should use setup response format");
  assert(openaiFetch.body.instructions.includes("Guardrail voice."), "OpenAI should use setup instructions");

  const playbackResult = runLiveSmoke({ providers: "openai", play: true });
  assert(playbackResult.status === 0, playbackResult.stderr || playbackResult.stdout);
  assertNoSecrets(playbackResult.stdout, "Playback live smoke output should not print provider keys");
  assertNoSecrets(playbackResult.stderr, "Playback live smoke errors should not print provider keys");

  const playbackParsed = JSON.parse(playbackResult.stdout);
  const playbackOpenai = playbackParsed.results?.[0];
  assert(playbackParsed.status === "passed", "Playback live smoke should pass with mocked OpenAI audio");
  assert(playbackOpenai.played === true, "Playback live smoke should report played=true");
  assert(typeof playbackOpenai.playbackMs === "number", "Playback live smoke should report playbackMs");
  assert(typeof playbackOpenai.totalMs === "number", "Playback live smoke should report totalMs");
  assert(playbackOpenai.totalMs >= playbackOpenai.synthMs, "Playback live smoke total should include synthesis time");

  const afplayArgs = fs.readFileSync(afplayLogPath, "utf8").trim().split(/\r?\n/);
  assert(afplayArgs.includes("-r"), "Playback live smoke should go through AudioPlayer rate args");
  assert(afplayArgs.includes("1.50"), "Playback live smoke should use setup playback rate");
  assert(afplayArgs.includes("-q"), "Playback live smoke should use AudioPlayer quiet-rate args");

  const failureResult = runLiveSmoke({ providers: "openai", play: false, forceError: "openai" });
  assert(failureResult.status === 1, "Failed live smoke should exit non-zero");
  assertNoSecrets(failureResult.stdout, "Failed live smoke stdout should redact provider keys");
  assertNoSecrets(failureResult.stderr, "Failed live smoke stderr should redact provider keys");
  const failureParsed = JSON.parse(failureResult.stderr);
  const failedOpenai = failureParsed.results?.[0];
  assert(failureParsed.status === "failed", "Failed live smoke should report failed status");
  assert(failedOpenai.provider === "openai", "Failed live smoke should identify the provider");
  assert(failedOpenai.status === "failed", "Failed provider result should be failed");
  assert(failedOpenai.error.includes("[redacted]"), "Failed live smoke should redact provider key inside error");

  const playbackTimeoutResult = runLiveSmoke({
    providers: "openai",
    play: true,
    maxMs: "200",
    afplaySleepSeconds: "1",
  });
  assert(playbackTimeoutResult.status === 1, "Playback timeout live smoke should exit non-zero");
  assertNoSecrets(playbackTimeoutResult.stdout, "Playback timeout stdout should redact provider keys");
  assertNoSecrets(playbackTimeoutResult.stderr, "Playback timeout stderr should redact provider keys");
  const playbackTimeoutParsed = JSON.parse(playbackTimeoutResult.stderr);
  const timeoutOpenai = playbackTimeoutParsed.results?.[0];
  assert(playbackTimeoutParsed.status === "failed", "Playback timeout should report failed status");
  assert(timeoutOpenai.provider === "openai", "Playback timeout should identify the provider");
  assert(timeoutOpenai.status === "failed", "Playback timeout provider result should be failed");
  assert(
    timeoutOpenai.error.includes("AudioPlayer playback exceeded"),
    "Playback timeout should surface the bounded AudioPlayer timeout",
  );
  assert(!fs.existsSync(liveSmokeOpenAIAudioPath), "Playback timeout should clean live smoke temp audio");

  console.log(
    JSON.stringify(
      {
        checked: [
          "live smoke uses focused setup overrides for Qwen-TTS, MiMo, and OpenAI",
          "live smoke reports synth and total latency for all providers without playback",
          "live smoke playback uses shared AudioPlayer rate path",
          "live smoke reports playback latency when playback is enabled",
          "live smoke sanitizes provider key output",
          "live smoke sanitizes provider key output on failures",
          "live smoke fails when shared AudioPlayer playback exceeds the latency limit",
          "live smoke cleans temp audio after playback failures",
          "live smoke sends expected provider API requests",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runLiveSmoke({ providers, play, forceError = "", maxMs = "30000", afplaySleepSeconds = "" }) {
  fs.rmSync(fetchLogPath, { force: true });
  fs.rmSync(afplayLogPath, { force: true });
  fs.rmSync(liveSmokeOpenAIAudioPath, { force: true });
  return spawnSync("node", ["--import", preloadPath, "scripts/verify-live-smoke.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      AI_VOICE_STUDIO_LIVE: "1",
      AI_VOICE_STUDIO_PROVIDERS: providers,
      AI_VOICE_STUDIO_TEXT: "AI Voice Studio guardrail smoke.",
      AI_VOICE_STUDIO_MAX_MS: maxMs,
      AI_VOICE_STUDIO_GUARDRAIL_FETCH_LOG: fetchLogPath,
      AI_VOICE_STUDIO_GUARDRAIL_AFPLAY_LOG: afplayLogPath,
      AI_VOICE_STUDIO_GUARDRAIL_FORCE_ERROR: forceError,
      AI_VOICE_STUDIO_GUARDRAIL_AFPLAY_SLEEP_SECONDS: afplaySleepSeconds,
      DASHSCOPE_API_KEY: fakeKeys.dashscope,
      QWEN_MODEL: "qwen3-tts-instruct-flash",
      QWEN_VOICE: "Ethan",
      QWEN_REGION: "beijing",
      QWEN_LANGUAGE_TYPE: "German",
      QWEN_PLAYBACK_RATE: "1",
      QWEN_INSTRUCTIONS: "Guardrail Qwen.",
      QWEN_OPTIMIZE_INSTRUCTIONS: "1",
      QWEN_BASE_URL: "https://dashscope.aliyuncs.com/api/v1",
      MIMO_API_KEY: fakeKeys.mimo,
      MIMO_TOKEN_PLAN_BASE_URL: "https://guardrail.mimo/v1",
      MIMO_MODEL: "mimo-v2.5-tts",
      MIMO_VOICE: "Chloe",
      MIMO_SPEECH_RATE: "0",
      MIMO_STYLE_PROMPT: "Guardrail MiMo style.",
      OPENAI_API_KEY: fakeKeys.openai,
      OPENAI_MODEL: "gpt-4o-mini-tts",
      OPENAI_VOICE: "cedar",
      OPENAI_RESPONSE_FORMAT: "wav",
      OPENAI_PLAYBACK_RATE: "1.5",
      OPENAI_INSTRUCTIONS: "Guardrail voice.",
      AI_VOICE_STUDIO_PLAY: play ? "1" : "",
      AI_VOICE_STUDIO_WRITE_AUDIO: "",
      AI_VOICE_STUDIO_KEEP_AUDIO: "",
    },
    encoding: "utf8",
  });
}

function readFetchLog() {
  return JSON.parse(fs.readFileSync(fetchLogPath, "utf8"));
}

function findProviderResult(parsed, provider) {
  const result = parsed.results?.find((item) => item.provider === provider);
  assert(result, `Missing ${provider} live smoke result`);
  return result;
}

function findFetch(fetchLog, urlPart) {
  const entry = fetchLog.find((item) => item.url.includes(urlPart));
  assert(entry, `Missing fetch call for ${urlPart}`);
  assert(entry.method === "POST", `${urlPart} should use POST`);
  return entry;
}

function assertNoSecrets(text, message) {
  for (const secret of Object.values(fakeKeys)) {
    assert(!text.includes(secret), message);
  }
}
