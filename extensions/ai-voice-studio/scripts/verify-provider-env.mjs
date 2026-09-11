import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-voice-studio-env-test-"));
const projectRoot = path.join(tempRoot, "project");
const homeRoot = path.join(tempRoot, "home");
fs.mkdirSync(projectRoot, { recursive: true });
fs.mkdirSync(homeRoot, { recursive: true });

const homeEnv = path.join(homeRoot, ".env");
const projectEnv = path.join(projectRoot, ".env");

fs.writeFileSync(
  homeEnv,
  [
    "OPENAI_API_KEY=sk-home-secret-1234567890",
    "MIMO_API_KEY=tp-home-secret-1234567890",
    "DASHSCOPE_API_KEY=sk-home-dashscope-secret-1234567890",
    "AI_VOICE_STUDIO_LIVE=1",
    "IGNORED_SECRET=should-not-load",
    "",
  ].join("\n"),
);
fs.writeFileSync(
  projectEnv,
  [
    "OPENAI_API_KEY=sk-project-should-not-override-home",
    "QWEN_INSTRUCTIONS='warm and clear'",
    "OPENAI_INSTRUCTIONS='warm and clear'",
    "",
  ].join("\n"),
);

try {
  verifyEnvHelper();
  verifyLiveEnvOutput();

  console.log(
    JSON.stringify(
      {
        checked: [
          "provider env helper loads allowed .env keys",
          "provider env helper ignores live flag",
          "provider env helper sanitizes secrets",
          "live env verifier does not print key values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function verifyEnvHelper() {
  const script = [
    "import { loadProviderEnvFiles, sanitizeError, summarizeProviderKeyStatus } from './scripts/lib/provider-env.mjs';",
    `const loaded = loadProviderEnvFiles(${JSON.stringify(projectRoot)});`,
    "const summary = summarizeProviderKeyStatus(loaded);",
    "const sanitized = sanitizeError(new Error(`bad ${process.env.OPENAI_API_KEY} ${process.env.MIMO_API_KEY} ${process.env.DASHSCOPE_API_KEY}`));",
    "console.log(JSON.stringify({",
    "  summary,",
    "  sanitized,",
    "  liveFlag: process.env.AI_VOICE_STUDIO_LIVE || '',",
    "  ignored: process.env.IGNORED_SECRET || '',",
    "  openaiInstructions: process.env.OPENAI_INSTRUCTIONS || '',",
    "  qwenInstructions: process.env.QWEN_INSTRUCTIONS || ''",
    "}));",
  ].join("\n");

  const result = runNode(script);
  assert(result.status === 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);

  assert(parsed.summary.qwen.status === "ready", "Qwen-TTS key should be ready from home .env");
  assert(parsed.summary.qwen.keys.apiKey.source === "~/.env", "Canonical DashScope key should win over alias");
  assert(parsed.summary.mimo.status === "ready", "MiMo key should be ready from home .env");
  assert(parsed.summary.openai.status === "ready", "OpenAI key should be ready from home .env");
  assert(parsed.summary.openai.keys.apiKey.source === "~/.env", "Home .env should win before project .env");
  assert(parsed.liveFlag === "", "Provider env helper must not load AI_VOICE_STUDIO_LIVE from .env");
  assert(parsed.ignored === "", "Provider env helper must ignore non-allowlisted names");
  assert(parsed.openaiInstructions === "warm and clear", "Provider env helper should parse quoted provider values");
  assert(parsed.qwenInstructions === "warm and clear", "Provider env helper should parse quoted Qwen values");
  assert(!parsed.sanitized.includes("secret"), "Sanitized message should not include secret fragments");
  assert(parsed.sanitized.includes("[redacted]"), "Sanitized message should redact provider keys");
}

function verifyLiveEnvOutput() {
  const result = spawnSync("node", [path.join(process.cwd(), "scripts/verify-live-env.mjs")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: homeRoot,
      OPENAI_API_KEY: "",
      MIMO_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      AI_VOICE_STUDIO_LIVE: "",
      IGNORED_SECRET: "",
    },
    encoding: "utf8",
  });

  assert(result.status === 0, result.stderr || result.stdout);
  assert(!result.stdout.includes("secret"), "verify:live-env output should not include key values");
  assert(result.stdout.includes('"readyProviders"'), "verify:live-env output should include readiness summary");
}

function runNode(script, extraEnv = {}) {
  return spawnSync("node", ["--input-type=module", "--eval", script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: homeRoot,
      ...extraEnv,
      OPENAI_API_KEY: "",
      MIMO_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      AI_VOICE_STUDIO_LIVE: "",
      IGNORED_SECRET: "",
    },
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
