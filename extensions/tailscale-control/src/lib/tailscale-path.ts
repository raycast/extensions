import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function discoverTailscalePath(
  envPath = process.env.PATH,
  executableCheck: (path: string) => boolean = isExecutable,
): string {
  const candidates = new Set<string>([
    "/opt/homebrew/bin/tailscale",
    "/usr/local/bin/tailscale",
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
  ]);

  if (envPath) {
    for (const segment of envPath.split(delimiter)) {
      const trimmed = segment.trim();
      if (!trimmed) {
        continue;
      }

      candidates.add(join(trimmed, "tailscale"));
    }
  }

  for (const candidate of candidates) {
    try {
      if (!executableCheck(candidate)) {
        continue;
      }

      return candidate;
    } catch {
      continue;
    }
  }

  return "tailscale";
}
