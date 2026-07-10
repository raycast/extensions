import { existsSync, readdirSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";

// Raycast launches extensions with a minimal PATH, so a bare `npx` often isn't
// resolvable. Rebuild a fuller PATH covering Homebrew and the common Node version
// managers (nvm / fnm / n / volta), mirroring the reference ccusage extension.

let cached: string | undefined;

function versionManagerBins(home: string): string[] {
  const bins: string[] = [];

  try {
    const nvmDir = join(home, ".nvm", "versions", "node");
    for (const version of readdirSync(nvmDir)) {
      const bin = join(nvmDir, version, "bin");
      if (existsSync(bin)) bins.push(bin);
    }
  } catch {
    // no nvm
  }

  const xdgData = process.env.XDG_DATA_HOME || join(home, ".local", "share");
  const fnmBase = existsSync(join(home, ".fnm")) ? join(home, ".fnm") : join(xdgData, "fnm");
  try {
    const fnmDir = join(fnmBase, "node-versions");
    for (const version of readdirSync(fnmDir)) {
      const bin = join(fnmDir, version, "installation", "bin");
      if (existsSync(bin)) bins.push(bin);
    }
  } catch {
    // no fnm
  }

  for (const p of [join(home, ".n", "bin"), join(home, ".volta", "bin"), join(home, ".npm-global", "bin")]) {
    if (existsSync(p)) bins.push(p);
  }
  return bins;
}

/** A PATH string with common Node install locations added, so `npx` resolves. Cached. */
export function getEnhancedPath(): string {
  if (cached !== undefined) return cached;
  const home = process.env.HOME ?? "";
  const appleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;
  const platform = appleSilicon ? ["/opt/homebrew/bin"] : ["/usr/local/bin"];
  const system = ["/usr/bin", "/bin"];
  const parts = [process.env.PATH ?? "", ...platform, ...(home ? versionManagerBins(home) : []), ...system];
  cached = parts.filter(Boolean).join(":");
  return cached;
}
