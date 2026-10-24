import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type ConfigSection = Record<string, string>;
export type AwsConfig = Map<string, ConfigSection>;
const retainedKeys = new Set([
  "region",
  "sso_session",
  "sso_account_id",
  "sso_role_name",
  "sso_start_url",
  "sso_region",
  "role_arn",
  "credential_process",
  "credential_source",
  "source_profile",
  "web_identity_token_file",
  "aws_access_key_id",
  "aws_secret_access_key",
  "aws_session_token",
]);
const conflictKeys = new Set([
  "credential_process",
  "credential_source",
  "source_profile",
  "web_identity_token_file",
  "aws_access_key_id",
  "aws_secret_access_key",
  "aws_session_token",
  "role_arn",
]);

export class ConfigError extends Error {
  constructor() {
    super("AWS config is unreadable or invalid. Check its INI syntax and file permissions.");
  }
}

/** Strict section/key parsing; retains only SSO metadata, never secret values. */
export function parseAwsConfig(text: string): AwsConfig {
  const result: AwsConfig = new Map();
  let section: ConfigSection | undefined;
  let nested = false;
  const seenKeys = new Set<string>();
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("[")) {
      const match = /^\[([^\]]+)\]\s*(?:[#;].*)?$/.exec(line);
      if (!match || result.has(match[1].trim())) throw new ConfigError();
      section = Object.create(null) as ConfigSection;
      result.set(match[1].trim(), section);
      seenKeys.clear();
      nested = false;
      continue;
    }
    if (!section) throw new ConfigError();
    // AWS service-specific nested settings are irrelevant to SSO discovery.
    if (nested && /^\s/.test(raw)) continue;
    nested = false;
    const match = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (!match) throw new ConfigError();
    const key = match[1].toLowerCase();
    if (seenKeys.has(key)) throw new ConfigError();
    seenKeys.add(key);
    nested = match[2] === "";
    if (retainedKeys.has(key)) section[key] = conflictKeys.has(key) ? "present" : match[2];
  }
  return result;
}

export function configPath(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.AWS_CONFIG_FILE || join(homedir(), ".aws", "config");
  const expanded = value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
  return resolve(expanded);
}

let cached: { signature: string; config: AwsConfig } | undefined;
export async function readAwsConfig(path = configPath()): Promise<AwsConfig> {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > 1024 * 1024) throw new ConfigError();
    const signature = `${path}:${info.ino}:${info.mtimeMs}:${info.ctimeMs}:${info.size}`;
    if (cached?.signature === signature) return cached.config;
    const config = parseAwsConfig(await readFile(path, "utf8"));
    cached = { signature, config };
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw new ConfigError();
  }
}
