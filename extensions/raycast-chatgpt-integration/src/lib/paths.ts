import os from "node:os";
import path from "node:path";

export const APP_DIR_NAME = ".raycast-chatgpt-provider";
export const PROVIDER_ID = "chatgpt-account";
export const PROVIDER_NAME = "ChatGPT Account";
export const DEFAULT_PROXY_PORT = 18792;
export const GATEWAY_TOKEN_FILE = "gateway-token";

export function appDir(): string {
  return path.join(os.homedir(), APP_DIR_NAME);
}

export function credentialsPath(): string {
  return path.join(appDir(), "credentials.json");
}

export function daemonPidPath(): string {
  return path.join(appDir(), "proxy.pid");
}

export function daemonLogPath(): string {
  return path.join(appDir(), "proxy.log");
}

export function gatewayTokenPath(): string {
  return path.join(appDir(), GATEWAY_TOKEN_FILE);
}

export function raycastProvidersPath(platform = process.platform): string {
  const home = os.homedir();
  if (platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "Raycast", "ai", "providers.yaml");
  }
  return path.join(home, ".config", "raycast", "ai", "providers.yaml");
}
