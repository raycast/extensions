import { homedir } from "node:os";
import { join } from "node:path";
import { lstatSync, readFileSync } from "node:fs";
import { GatewayCredentials, Result, err, ok } from "./types";

export type CredentialsFileError =
  | { kind: "missing" }
  | { kind: "not-a-regular-file" }
  | { kind: "insecure-permissions" }
  | { kind: "invalid-format"; detail: string }
  | { kind: "unreadable" };

const CREDENTIALS_DIR_NAME = ".config/grok-bot-raycast";
const CREDENTIALS_FILE_NAME = "gateway.env";

const URL_KEYS = new Set(["GATEWAY_URL", "GROKBOT_GATEWAY_URL", "SAND_GATEWAY_URL"]);
const TOKEN_KEYS = new Set(["GATEWAY_TOKEN", "SAND_GATEWAY_TOKEN"]);

function credentialsFilePath(): string {
  return join(homedir(), CREDENTIALS_DIR_NAME, CREDENTIALS_FILE_NAME);
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function isEnoent(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "ENOENT";
}

export function parseGatewayEnv(text: string): Result<GatewayCredentials, CredentialsFileError> {
  let gatewayUrl = "";
  let gatewayToken = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      return err({ kind: "invalid-format", detail: "gateway.env lines must be KEY=VALUE" });
    }

    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1).trim());

    if (URL_KEYS.has(key)) {
      gatewayUrl = value;
    } else if (TOKEN_KEYS.has(key)) {
      gatewayToken = value;
    }
  }

  if (gatewayUrl.length === 0 || gatewayToken.length === 0) {
    return err({ kind: "invalid-format", detail: "gateway.env must set a URL and a token" });
  }

  return ok({ gatewayUrl, gatewayToken });
}

export function loadGatewayCredentialsFile(filePath: string): Result<GatewayCredentials, CredentialsFileError> {
  try {
    const stat = lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return err({ kind: "not-a-regular-file" });
    }
    if ((stat.mode & 0o077) !== 0) {
      return err({ kind: "insecure-permissions" });
    }

    return parseGatewayEnv(readFileSync(filePath, "utf8"));
  } catch (error) {
    if (isEnoent(error)) {
      return err({ kind: "missing" });
    }
    return err({ kind: "unreadable" });
  }
}

export function loadDefaultGatewayCredentialsFile(): Result<GatewayCredentials, CredentialsFileError> {
  return loadGatewayCredentialsFile(credentialsFilePath());
}
