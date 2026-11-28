import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export async function fallbackFennPath(
  home = homedir(),
  canAccess: (path: string) => Promise<unknown> = access,
): Promise<string | null> {
  for (const path of ["/Applications/Fenn.app", join(home, "Applications", "Fenn.app")]) {
    try {
      await canAccess(path);
      return path;
    } catch {
      // Try the other standard application directory.
    }
  }
  return null;
}
