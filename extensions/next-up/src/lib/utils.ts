import { open } from "@raycast/api";

/**
 * Generates a UUID v4 string using the platform's crypto API.
 * Falls back to Math.random() in environments where crypto is unavailable.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidTime(time: string): boolean {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export async function openLink(url: string): Promise<void> {
  await open(url);
}

export async function emailProfessor(email: string): Promise<void> {
  await open(`mailto:${email}`);
}
