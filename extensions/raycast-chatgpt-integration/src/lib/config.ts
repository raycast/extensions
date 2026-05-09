import crypto from "node:crypto";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import { appDir, gatewayTokenPath, DEFAULT_PROXY_PORT } from "./paths.js";

export type AppConfig = {
  port: number;
  token: string;
};

export async function ensureAppDir(): Promise<void> {
  await fs.mkdir(appDir(), { recursive: true, mode: 0o700 });
}

export function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PROXY_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return DEFAULT_PROXY_PORT;
  }
  return port;
}

export async function readOrCreateGatewayToken(): Promise<string> {
  await ensureAppDir();
  const file = gatewayTokenPath();
  try {
    const existing = (await fs.readFile(file, "utf8")).trim();
    if (existing.length >= 24) {
      return existing;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const token = crypto.randomBytes(32).toString("hex");
  await fs.writeFile(file, token, { mode: 0o600 });
  return token;
}

export async function loadAppConfig(portOverride?: string): Promise<AppConfig> {
  return {
    port: parsePort(portOverride ?? process.env.RAYCAST_CHATGPT_PROXY_PORT),
    token: await readOrCreateGatewayToken(),
  };
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
