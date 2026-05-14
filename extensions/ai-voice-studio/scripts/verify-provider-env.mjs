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
    "AI_VOICE_STUDIO_LIVE=1",
    "IGNORED_SECRET=should-not-load",
    "",
  ].join("\n"),
);
fs.writeFileSync(
  projectEnv,
  [
    "MINIMAX_TOKEN_PLAN_KEY=tp-project-secret-1234567890",
    "MINIMAX_API_KEY=sk-project-legacy-secret-1234567890",
    "OPENAI_API_KEY=sk-project-should-not-override-home",
    "OPENAI_INSTRUCTIONS='warm and clear'",
    "",
  ].join("\n"),
);

try {
  verifyEnvHelper();
  verifyMiniMaxAlias();
  verifyLiveEnvOutput();

  console.log(
    JSON.stringify(
      {
        checked: [
          "provider env helper loads allowed .env keys",
          "provider env helper maps legacy MiniMax API key alias",
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
    "const sanitized = sanitizeError(new Error(`bad ${process.env.OPENAI_API_KEY} ${process.env.MIMO_API_KEY} ${process.env.MINIMAX_TOKEN_PLAN_KEY}`));",
    "console.log(JSON.stringify({",
    "  summary,",
    "  sanitized,",
    "  liveFlag: process.env.AI_VOICE_STUDIO_LIVE || '',",
    "  ignored: process.env.IGNORED_SECRET || '',",
    "  openaiInstructions: process.env.OPENAI_INSTRUCTIONS || ''",
    "}));",
  ].join("\n");

  const result = runNode(script);
  assert(result.status === 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);

  assert(parsed.summary.minimax.status === "ready", "MiniMax key should be ready from project .env");
  assert(
    !parsed.summary.minimax.keys.tokenPlan.source.endsWith(":MINIMAX_API_KEY"),
    "Canonical MiniMax key should win over alias",
  );
  assert(parsed.summary.mimo.status === "ready", "MiMo key should be ready from home .env");
  assert(parsed.summary.openai.status === "ready", "OpenAI key should be ready from home .env");
  assert(parsed.summary.openai.keys.apiKey.source === "~/.env", "Home .env should win before project .env");
  assert(parsed.liveFlag === "", "Provider env helper must not load AI_VOICE_STUDIO_LIVE from .env");
  assert(parsed.ignored === "", "Provider env helper must ignore non-allowlisted names");
  assert(parsed.openaiInstructions === "warm and clear", "Provider env helper should parse quoted provider values");
  assert(!parsed.sanitized.includes("secret"), "Sanitized message should not include secret fragments");
  assert(parsed.sanitized.includes("[redacted]"), "Sanitized message should redact provider keys");
}

function verifyMiniMaxAlias() {
  const aliasProjectRoot = path.join(tempRoot, "alias-project");
  fs.mkdirSync(aliasProjectRoot, { recursive: true });
  fs.writeFileSync(path.join(aliasProjectRoot, ".env"), ["MINIMAX_API_KEY=sk-legacy-secret-1234567890", ""].join("\n"));

  const script = [
    "import { loadProviderEnvFiles, summarizeProviderKeyStatus } from './scripts/lib/provider-env.mjs';",
    `const loaded = loadProviderEnvFiles(${JSON.stringify(aliasProjectRoot)});`,
    "const summary = summarizeProviderKeyStatus(loaded);",
    "console.log(JSON.stringify({ summary }));",
  ].join("\n");

  const result = runNode(script);
  assert(result.status === 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert(parsed.summary.minimax.status === "ready", "MiniMax alias key should make provider ready");
  assert(
    parsed.summary.minimax.keys.tokenPlan.source.endsWith(":MINIMAX_API_KEY"),
    "MiniMax alias source should be reported without printing the key",
  );
}

function verifyLiveEnvOutput() {
  const result = spawnSync("node", [path.join(process.cwd(), "scripts/verify-live-env.mjs")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: homeRoot,
      OPENAI_API_KEY: "",
      MIMO_API_KEY: "",
      MINIMAX_API_KEY: "",
      MINIMAX_TOKEN_PLAN_KEY: "",
      MINIMAX_OPEN_PLATFORM_API_KEY: "",
      AI_VOICE_STUDIO_LIVE: "",
      IGNORED_SECRET: "",
    },
    encoding: "utf8",
  });

  assert(result.status === 0, result.stderr || result.stdout);
  assert(!result.stdout.includes("secret"), "verify:live-env output should not include key values");
  assert(result.stdout.includes('"readyProviders"'), "verify:live-env output should include readiness summary");
}

function runNode(script) {
  return spawnSync("node", ["--input-type=module", "--eval", script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: homeRoot,
      OPENAI_API_KEY: "",
      MIMO_API_KEY: "",
      MINIMAX_API_KEY: "",
      MINIMAX_TOKEN_PLAN_KEY: "",
      MINIMAX_OPEN_PLATFORM_API_KEY: "",
      AI_VOICE_STUDIO_LIVE: "",
      IGNORED_SECRET: "",
    },
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
