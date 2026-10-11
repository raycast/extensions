import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Read origin remote from `.git/config` and normalize to an https URL when possible. */
export function tryGetGitRemoteUrl(directory: string): string | null {
  const configPath = path.join(directory, ".git", "config");
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf8");
    const originSection = content.match(/\[remote\s+"origin"\][\s\S]*?(?=\[|$)/);
    if (!originSection) {
      return null;
    }

    const urlMatch = originSection[0].match(/^\s*url\s*=\s*(.+)$/m);
    if (!urlMatch) {
      return null;
    }

    return normalizeRemoteUrl(urlMatch[1].trim());
  } catch {
    return null;
  }
}

function normalizeRemoteUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url.replace(/\.git$/, "");
  }

  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  return url;
}
