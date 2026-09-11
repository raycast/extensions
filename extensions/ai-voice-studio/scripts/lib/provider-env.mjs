import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROVIDER_ENV_NAMES = [
  "DASHSCOPE_API_KEY",
  "QWEN_MODEL",
  "QWEN_VOICE",
  "QWEN_REGION",
  "QWEN_LANGUAGE_TYPE",
  "QWEN_PLAYBACK_RATE",
  "QWEN_INSTRUCTIONS",
  "QWEN_OPTIMIZE_INSTRUCTIONS",
  "QWEN_BASE_URL",
  "MIMO_API_KEY",
  "MIMO_TOKEN_PLAN_BASE_URL",
  "MIMO_MODEL",
  "MIMO_VOICE",
  "MIMO_SPEECH_RATE",
  "MIMO_STYLE_PROMPT",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_VOICE",
  "OPENAI_RESPONSE_FORMAT",
  "OPENAI_PLAYBACK_RATE",
  "OPENAI_INSTRUCTIONS",
];

const SECRET_ENV_NAMES = [
  "DASHSCOPE_API_KEY",
  "MIMO_API_KEY",
  "OPENAI_API_KEY",
];

const providerEnvNames = new Set(PROVIDER_ENV_NAMES);

const ENV_ALIASES = {};

export function loadProviderEnvFiles(root = process.cwd()) {
  const loaded = {};
  Object.assign(loaded, applyProviderEnvAliases("shell"));
  for (const filePath of [path.join(os.homedir(), ".env"), path.join(root, ".env")]) {
    Object.assign(loaded, loadProviderEnvFile(filePath));
  }
  return loaded;
}

export function summarizeProviderKeyStatus(loaded = {}) {
  return {
    qwen: {
      status: process.env.DASHSCOPE_API_KEY ? "ready" : "missing",
      keys: {
        apiKey: keyStatus("DASHSCOPE_API_KEY", loaded),
      },
    },
    mimo: {
      status: process.env.MIMO_API_KEY ? "ready" : "missing",
      keys: {
        apiKey: keyStatus("MIMO_API_KEY", loaded),
      },
    },
    openai: {
      status: process.env.OPENAI_API_KEY ? "ready" : "missing",
      keys: {
        apiKey: keyStatus("OPENAI_API_KEY", loaded),
      },
    },
  };
}

export function sanitizeError(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const keyName of SECRET_ENV_NAMES) {
    const secret = process.env[keyName];
    if (secret && secret.length > 3) {
      message = message.split(secret).join("[redacted]");
    }
  }
  return message.replace(/\b(?:sk|tp)-[A-Za-z0-9._-]{8,}\b/g, "[redacted]");
}

function loadProviderEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const loaded = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [name, value] = parsed;
    if (!providerEnvNames.has(name) || hasEnvValue(name)) continue;
    process.env[name] = value;
    loaded[name] = displayEnvSource(filePath);
    Object.assign(loaded, applyProviderEnvAliases(displayEnvSource(filePath)));
  }
  return loaded;
}

function applyProviderEnvAliases(source) {
  const loaded = {};
  for (const [aliasName, canonicalName] of Object.entries(ENV_ALIASES)) {
    if (!hasEnvValue(aliasName) || hasEnvValue(canonicalName)) continue;
    process.env[canonicalName] = process.env[aliasName];
    loaded[canonicalName] = `${source}:${aliasName}`;
  }
  return loaded;
}

function keyStatus(name, loaded) {
  return hasEnvValue(name)
    ? {
        present: true,
        source: loaded[name] ?? "shell",
      }
    : { present: false };
}

function hasEnvValue(name) {
  return process.env[name] !== undefined && process.env[name] !== "";
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) return null;
  const [, name, rawValue] = match;
  return [name, unquoteEnvValue(rawValue.trim())];
}

function unquoteEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function displayEnvSource(filePath) {
  const homeEnv = path.join(os.homedir(), ".env");
  if (filePath === homeEnv) return "~/.env";
  return path.relative(process.cwd(), filePath) || ".env";
}
