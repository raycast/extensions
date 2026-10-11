import { LocalStorage } from "@raycast/api";

/**
 * Printer connection details. Stored in Raycast's LocalStorage, which is an
 * encrypted, per-extension database. The access code is never logged or shown.
 */
export interface PrinterConfig {
  ip: string;
  accessCode: string;
}

const IP_KEY = "printerIp";
const CODE_KEY = "accessCode";

export async function loadConfig(): Promise<PrinterConfig | undefined> {
  const [ip, accessCode] = await Promise.all([
    LocalStorage.getItem<string>(IP_KEY),
    LocalStorage.getItem<string>(CODE_KEY),
  ]);
  if (!ip || !accessCode) return undefined;
  return { ip, accessCode };
}

export async function saveConfig(config: PrinterConfig): Promise<void> {
  await LocalStorage.setItem(IP_KEY, config.ip.trim());
  await LocalStorage.setItem(CODE_KEY, config.accessCode.trim());
}

export async function clearConfig(): Promise<void> {
  await LocalStorage.removeItem(IP_KEY);
  await LocalStorage.removeItem(CODE_KEY);
}

/** Returns an error message, or undefined if the value is a valid IPv4 address. */
export function validateIp(value: string | undefined): string | undefined {
  const v = (value ?? "").trim();
  if (!v) return "Enter the printer's IP address";
  const parts = v.split(".");
  const ok =
    parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && String(Number(p)) === p);
  return ok ? undefined : "Should look like 192.168.1.50";
}

/** Returns an error message, or undefined if the value looks like a Bambu access code. */
export function validateAccessCode(value: string | undefined): string | undefined {
  const v = (value ?? "").trim();
  if (!v) return "Enter the 8-character access code";
  if (v.length !== 8) return `Access code must be 8 characters (got ${v.length})`;
  if (!/^[A-Za-z0-9]+$/.test(v)) return "Access code should only contain letters and numbers";
  return undefined;
}

export function streamUrl(config: PrinterConfig): string {
  return `rtsps://bblp:${encodeURIComponent(config.accessCode)}@${config.ip}:322/streaming/live/1`;
}
