import { existsSync } from "node:fs";

export function exists(p: string) {
  try {
    return existsSync(p.startsWith("file://") ? new URL(p) : p);
  } catch {
    return false;
  }
}
