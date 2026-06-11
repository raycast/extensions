import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function remoteToBrowserUrl(input: string) {
  const value = input.trim();
  if (!value) return undefined;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      url.username = "";
      url.password = "";
      return url
        .toString()
        .replace(/\.git$/, "")
        .replace(/\/$/, "");
    } catch {
      return value
        .replace(/^https?:\/\/[^@]+@/, (match) =>
          match.slice(0, match.indexOf("//") + 2),
        )
        .replace(/\.git$/, "");
    }
  }

  const sshMatch = /^(?:ssh:\/\/)?git@([^:/]+)[:/]([^\s]+?)(?:\.git)?$/.exec(
    value,
  );
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  const protocolMatch = /^ssh:\/\/git@([^/]+)\/([^\s]+?)(?:\.git)?$/.exec(
    value,
  );
  if (protocolMatch) {
    return `https://${protocolMatch[1]}/${protocolMatch[2]}`;
  }

  return undefined;
}

async function gitOutput(worktree: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, { cwd: worktree });
  return stdout.trim();
}

export async function projectRemoteUrl(worktree: string) {
  const candidates = ["origin", "upstream"];
  for (const remote of candidates) {
    try {
      const url = await gitOutput(worktree, ["remote", "get-url", remote]);
      if (url) return url;
    } catch {
      // try next remote
    }
  }

  const remotes = await gitOutput(worktree, ["remote"]);
  const first = remotes
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean);
  if (!first) throw new Error(`No git remote found for ${worktree}`);
  return gitOutput(worktree, ["remote", "get-url", first]);
}

export async function projectRemoteBrowserUrl(worktree: string) {
  const remote = await projectRemoteUrl(worktree);
  const url = remoteToBrowserUrl(remote);
  if (!url) throw new Error(`Unsupported git remote URL: ${remote}`);
  return url;
}
