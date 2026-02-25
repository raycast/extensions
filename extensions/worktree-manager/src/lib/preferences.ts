import * as os from "os";
import * as path from "path";

export interface Preferences {
  roots: string;
  openWith: string;
  defaultWorktreePath?: string;
}

export function expandRoots(rootsStr: string): string[] {
  if (!rootsStr?.trim()) return [];
  const home = os.homedir();
  return rootsStr
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => (r.startsWith("~") ? path.join(home, r.slice(1)) : r));
}
