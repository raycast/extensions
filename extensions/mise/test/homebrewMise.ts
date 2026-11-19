import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";

// Lays out bin/mise -> ../Cellar/mise/<version>/bin/mise the way Homebrew links it, in a temp dir
// removed after each test, and returns the bin/mise path.
export function homebrewMise(): () => string {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  return () => {
    const dir = mkdtempSync(join(tmpdir(), "mise-homebrew-"));
    dirs.push(dir);
    mkdirSync(join(dir, "Cellar/mise/2026.10.15/bin"), { recursive: true });
    writeFileSync(join(dir, "Cellar/mise/2026.10.15/bin/mise"), "");
    mkdirSync(join(dir, "bin"));
    symlinkSync("../Cellar/mise/2026.10.15/bin/mise", join(dir, "bin/mise"));
    return join(dir, "bin/mise");
  };
}
