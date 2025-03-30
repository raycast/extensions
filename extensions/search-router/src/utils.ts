import { open } from "@raycast/api";

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function safeOpenUrl(url: string): Promise<void> {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }
  return await open(url);
}
