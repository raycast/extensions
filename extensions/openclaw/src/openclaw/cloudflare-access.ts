import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import type { ResolvedPreferences } from "./config";

const execFileAsync = promisify(execFile);
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const TOKEN_EXPIRY_MARGIN_SECONDS = 30;

function cloudflaredCandidates(): string[] {
  const pathCandidates = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((directory) => join(directory, "cloudflared"));

  return [
    ...pathCandidates,
    "/opt/homebrew/bin/cloudflared",
    "/usr/local/bin/cloudflared",
  ];
}

export function findCloudflared(): string | undefined {
  return cloudflaredCandidates().find((candidate) => existsSync(candidate));
}

function cloudflaredMissingError(): Error {
  return new Error(
    "Cloudflare browser sign-in needs cloudflared. Install it with `brew install cloudflared`, then try again.",
  );
}

function jwtFromOutput(output: string): string {
  const token = output
    .split(/\s+/)
    .find((candidate) => candidate.split(".").length === 3);
  if (!token) {
    throw new Error("Cloudflare Access did not return an application token.");
  }
  return token;
}

function tokenIsCurrent(token: string): boolean {
  try {
    const encodedPayload = token.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return (
      typeof payload.exp === "number" &&
      payload.exp > Date.now() / 1000 + TOKEN_EXPIRY_MARGIN_SECONDS
    );
  } catch {
    return false;
  }
}

function commandError(error: unknown): Error {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return cloudflaredMissingError();
  }

  if (
    error &&
    typeof error === "object" &&
    "killed" in error &&
    error.killed === true
  ) {
    return new Error(
      "Cloudflare Access sign-in timed out. Start it again from Gateway Status.",
    );
  }

  return new Error(
    "Cloudflare Access sign-in failed. Try again from Gateway Status. Raycast does not display cloudflared output because it can contain authentication tokens.",
  );
}

async function runCloudflared(args: string[]): Promise<string> {
  const binary = findCloudflared();
  if (!binary) throw cloudflaredMissingError();

  try {
    const { stdout } = await execFileAsync(binary, args, {
      encoding: "utf8",
      timeout: AUTH_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    throw commandError(error);
  }
}

async function cachedAccessToken(appUrl: string): Promise<string | undefined> {
  try {
    const output = await runCloudflared(["access", "token", `--app=${appUrl}`]);
    const token = jwtFromOutput(output);
    return tokenIsCurrent(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

export async function authenticateCloudflareAccess(
  appUrl: string,
): Promise<string> {
  const output = await runCloudflared([
    "access",
    "login",
    `--app=${appUrl}`,
    "--no-verbose",
    "--auto-close",
  ]);
  const token = jwtFromOutput(output);
  if (!tokenIsCurrent(token)) {
    throw new Error("Cloudflare Access returned an expired application token.");
  }
  return token;
}

export async function resolveEdgeAuthHeaders(
  preferences: ResolvedPreferences,
): Promise<Readonly<Record<string, string>> | undefined> {
  if (preferences.connectionMode !== "cloudflare") {
    return preferences.edgeAuthHeaders;
  }
  if (preferences.cloudflareAuthMode === "service-token") {
    return preferences.edgeAuthHeaders;
  }

  const token =
    (await cachedAccessToken(preferences.webUrl)) ??
    (await authenticateCloudflareAccess(preferences.webUrl));
  return { "Cf-Access-Token": token };
}
