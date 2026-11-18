import { spawnSync } from "node:child_process";
import { sanitizeError } from "./lib/provider-env.mjs";
import { readFreshVerificationEvidence } from "./lib/verification-evidence.mjs";

const objective = "Check runtime states for bugs; keep TTS playback stable and fast when provider APIs allow it.";

const evidence = [];
const blockers = [];

const localVerify = evidenceGate("local-verify", {
  criterion: "local runtime/build/lint/type/audit gates",
  command: "npm run verify",
  paths: [
    "src",
    "scripts",
    "package.json",
    "package-lock.json",
    "README.md",
    "CHANGELOG.md",
    "tsconfig.json",
    "eslint.config.js",
    ".prettierrc",
  ],
});
evidence.push(localVerify);

const localPlayback = evidenceGate("local-playback", {
  criterion: "real local AudioPlayer/afplay playback smoke",
  command: "npm run verify:local-playback",
  paths: [
    "src/utils/audio-player.ts",
    "scripts/verify-local-playback.mjs",
    "scripts/lib/verification-evidence.mjs",
    "package.json",
    "package-lock.json",
  ],
});
evidence.push(localPlayback);

const liveEnv = runCommand("npm", ["run", "verify:live-env"], {
  criterion: "real provider key readiness",
  required: true,
  allowFailure: true,
});
const liveEnvSummary = parseJson(liveEnv.stdout);
evidence.push({
  ...liveEnv,
  summary: liveEnvSummary
    ? {
        readyProviders: liveEnvSummary.readyProviders,
        providers: liveEnvSummary.providers,
      }
    : undefined,
});

const readyProviders = liveEnvSummary?.readyProviders ?? [];
let liveSmoke = null;
if (readyProviders.length === 0) {
  blockers.push("No Qwen-TTS, MiMo, or OpenAI provider key is available, so real provider API smoke cannot run.");
} else if (process.env.AI_VOICE_STUDIO_LIVE !== "1") {
  blockers.push("Provider keys are present, but AI_VOICE_STUDIO_LIVE=1 was not set for real provider API smoke.");
} else {
  liveSmoke = runCommand("npm", ["run", "verify:live-smoke"], {
    criterion: "real provider API audio, latency, and optional playback smoke",
    required: true,
  });
  evidence.push(liveSmoke);
}

for (const item of evidence) {
  if (item.required && !item.passed && !item.allowFailure) {
    if (item.needsDirectRun) {
      blockers.push(`${item.criterion} needs a fresh direct run: ${item.command}`);
    } else {
      blockers.push(`${item.criterion} failed`);
    }
  }
}

const status = blockers.length === 0 ? "complete" : "blocked";
const report = {
  status,
  objective,
  checklist: [
    {
      requirement: "No obvious runtime/build/type/lint/security regressions",
      evidence: "npm run verify",
      status: localVerify.passed ? "passed" : "needs-direct-run",
    },
    {
      requirement: "TTS playback wrapper works on this Mac",
      evidence: "npm run verify:local-playback",
      status: localPlayback.passed ? "passed" : "needs-direct-run",
    },
    {
      requirement: "Real provider API verification is possible",
      evidence: "npm run verify:live-env",
      status: readyProviders.length > 0 ? "ready" : "blocked",
    },
    {
      requirement: "Real API audio, latency, and playback smoke passed",
      evidence: "AI_VOICE_STUDIO_LIVE=1 npm run verify:live-smoke",
      status: liveSmoke ? (liveSmoke.passed ? "passed" : "failed") : "not-run",
    },
  ],
  blockers,
  evidence,
};

const output = JSON.stringify(report, null, 2);
if (status === "complete") {
  console.log(output);
} else {
  console.error(output);
  process.exit(1);
}

function evidenceGate(name, { criterion, command, paths }) {
  const result = readFreshVerificationEvidence(process.cwd(), name, paths);
  return {
    criterion,
    command,
    required: true,
    allowFailure: false,
    passed: result.fresh,
    needsDirectRun: !result.fresh,
    evidenceFile: result.filePath,
    reason: result.fresh ? undefined : result.reason,
    createdAt: result.evidence?.createdAt,
  };
}

function runCommand(command, args, { criterion, required = false, allowFailure = false, attempts = 1 }) {
  let result;
  const commandString = [command, ...args].map(shellQuote).join(" ");
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = spawnSync("zsh", ["-lc", commandString], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
    });
    if (result.status === 0 || attempt === attempts) break;
  }

  return {
    criterion,
    command: commandString,
    required,
    allowFailure,
    passed: result.status === 0,
    statusCode: result.status,
    attempts,
    stdout: result.status === 0 ? summarizeOutput(result.stdout) : summarizeOutput(sanitizeError(result.stdout)),
    stderr: result.status === 0 ? summarizeOutput(result.stderr) : summarizeOutput(sanitizeError(result.stderr)),
  };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function summarizeOutput(output) {
  const lines = output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  return lines.slice(-80).join("\n");
}

function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch {
    const jsonStart = output.indexOf("{");
    if (jsonStart < 0) return null;
    try {
      return JSON.parse(output.slice(jsonStart));
    } catch {
      return null;
    }
  }
}
