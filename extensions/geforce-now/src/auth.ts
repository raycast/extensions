import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface StarfleetTokens {
  clientToken: string;
  accessToken: string;
  idToken: string;
}

export function getSharedstoragePath(): string {
  const appDataLocal = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(appDataLocal, "NVIDIA Corporation", "GeForceNOW", "sharedstorage.json");
}

function decodePayload(payload: string): string {
  try {
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return decodeURIComponent(decoded);
  } catch {
    return payload;
  }
}

export function loadAuthTokens(): StarfleetTokens | null {
  try {
    const storagePath = getSharedstoragePath();
    if (!fs.existsSync(storagePath)) return null;

    const storageData = JSON.parse(fs.readFileSync(storagePath, "utf-8"));
    const encoded = storageData?.starfleetSession?.data;
    if (typeof encoded !== "string") return null;

    const tokens = JSON.parse(decodePayload(encoded)) as StarfleetTokens;
    if (tokens.accessToken && tokens.clientToken && tokens.idToken) return tokens;
    return null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return loadAuthTokens()?.accessToken || null;
}

export function getIdToken(): string | null {
  return loadAuthTokens()?.idToken || null;
}
