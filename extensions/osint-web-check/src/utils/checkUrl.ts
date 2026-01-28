import { lookup } from "node:dns/promises";

export async function checkUrl(url: string): Promise<boolean> {
  try {
    const hostname = new URL(url).hostname;
    await lookup(hostname);

    return true;
  } catch {
    return false;
  }
}
