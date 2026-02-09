import { ExtensionPreferences } from "./preferences";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const DEFAULT_TIMEOUT_MS = 8_000;
const TIDBYT_API_BASE = "https://api.tidbyt.com";
const execFileAsync = promisify(execFile);

function getTidbytConfig(prefs: ExtensionPreferences): {
  deviceId: string;
  authHeader: string;
  pixletPath: string;
} {
  const deviceId = prefs.tidbytDeviceId?.trim();
  const apiToken = prefs.tidbytApiToken?.trim();
  const pixletPath = prefs.tidbytPixletPath?.trim() || "pixlet";

  if (!deviceId || !apiToken) {
    throw new Error(
      "Tidbyt Device ID and API Key are required to push updates. Configure them in the extension preferences."
    );
  }

  return {
    deviceId,
    authHeader: normalizeAuthHeader(apiToken),
    pixletPath,
  };
}

export async function pushImage(
  prefs: ExtensionPreferences,
  installationId: string,
  base64Webp: string
): Promise<void> {
  const { deviceId, authHeader, pixletPath } = getTidbytConfig(prefs);
  const token = extractBearerToken(authHeader);
  const tidbytInstallationId = normalizeInstallationId(installationId);
  const buffer = Buffer.from(base64Webp, "base64");
  const tmpPath = path.join(
    os.tmpdir(),
    `raycast-focus-tidbyt-${Date.now()}.webp`
  );
  await fs.writeFile(tmpPath, buffer);
  try {
    await execFileAsync(pixletPath, [
      "push",
      "--api-token",
      token,
      "--installation-id",
      tidbytInstallationId,
      deviceId,
      tmpPath,
    ]);
  } catch (error) {
    const message = redactToken(toErrorMessage(error), token);
    throw new Error(`Tidbyt push failed (pixlet): ${message}`);
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

export async function removeInstallation(
  prefs: ExtensionPreferences,
  installationId: string
): Promise<void> {
  const { deviceId, authHeader } = getTidbytConfig(prefs);
  const tidbytInstallationId = normalizeInstallationId(installationId);
  const url = `${TIDBYT_API_BASE}/v0/devices/${deviceId}/installations/${tidbytInstallationId}`;
  const response = await fetchWithTimeout(
    url,
    {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tidbyt remove failed (${response.status}): ${text}`);
  }
}

function extractBearerToken(authHeader: string): string {
  const raw = authHeader.trim();
  const lower = raw.toLowerCase();
  if (lower.startsWith("bearer ")) {
    return raw.slice("bearer ".length).trim();
  }
  return raw;
}

function normalizeAuthHeader(apiToken: string): string {
  const raw = apiToken.trim();
  const jwtMatch = extractJwt(raw);
  if (jwtMatch) {
    return `Bearer ${jwtMatch[0]}`;
  }

  let token = raw;
  const lower = token.toLowerCase();
  if (lower.startsWith("authorization:")) {
    token = token.slice("authorization:".length).trim();
  }
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice("bearer ".length).trim();
  }
  token = token.replace(/\s+/g, "");
  token = token.replace(/^['"]+|['"]+$/g, "");
  return `Bearer ${token}`;
}

export function getTidbytAuthDebugInfo(apiToken: string | undefined): string {
  if (!apiToken) return "token:missing";
  const raw = apiToken.trim();
  const jwtMatch = extractJwt(raw);
  const hasAuthPrefix = raw.toLowerCase().includes("authorization:");
  const hasBearerPrefix = raw.toLowerCase().includes("bearer ");
  const cleaned = stripToken(raw);
  const parts = cleaned.split(".");
  const partLengths = parts.map((part) => part.length).join("/");
  return [
    `rawLen=${raw.length}`,
    `cleanLen=${cleaned.length}`,
    `hasAuthPrefix=${hasAuthPrefix}`,
    `hasBearerPrefix=${hasBearerPrefix}`,
    `jwtFound=${Boolean(jwtMatch)}`,
    `jwtLen=${jwtMatch?.[0].length ?? 0}`,
    `parts=${parts.length}`,
    `partLens=${partLengths}`,
  ].join(" ");
}

function extractJwt(token: string): RegExpMatchArray | null {
  return token.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
}

function stripToken(raw: string): string {
  let token = raw.trim();
  const lower = token.toLowerCase();
  if (lower.startsWith("authorization:")) {
    token = token.slice("authorization:".length).trim();
  }
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice("bearer ".length).trim();
  }
  token = token.replace(/\s+/g, "");
  token = token.replace(/^['"]+|['"]+$/g, "");
  return token;
}

function normalizeInstallationId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : "raycastfocus";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function redactToken(message: string, token: string): string {
  if (!message) return message;
  let redacted = message;
  if (token) {
    redacted = redacted.split(token).join("<redacted>");
  }
  redacted = redacted.replace(/--api-token\s+\S+/g, "--api-token <redacted>");
  return redacted;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
