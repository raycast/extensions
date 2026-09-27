import { randomUUID } from "node:crypto";
import { storageGet, storageSet } from "./storage";

const KEY = "install_id";
let cached: string | null = null;

// One random UUID per Raycast install, persisted for the life of the extension and sent as
// x-install-id on every request (logged out included) — APP_STANDARDS S2.
export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  const existing = await storageGet<string>(KEY);
  if (existing) return (cached = existing);
  const id = randomUUID();
  await storageSet(KEY, id);
  return (cached = id);
}

export function resetInstallIdCache(): void {
  cached = null;
}
