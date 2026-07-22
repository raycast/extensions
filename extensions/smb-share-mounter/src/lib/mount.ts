import { execFile } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import type { Share } from "./share";

const CONNECTION_TIMEOUT_MS = 2_000;
const execFileAsync = promisify(execFile);

export function isSmbReachable(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: 445 });
    let settled = false;

    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(CONNECTION_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function mountShare(share: Share): Promise<void> {
  // `open` hands the smb:// URL to Finder/LaunchServices and returns immediately.
  // Using AppleScript's "tell application Finder to mount volume" instead requires
  // Automation (Apple Events) permission and blocks until any credential dialog is
  // dismissed, which is what caused mounts to fail or hang with
  // "Command failed: /usr/bin/osascript ...".
  await execFileAsync("/usr/bin/open", [share.url]);
}

type MountLocation = {
  host: string;
  path: string;
  mountPoint: string;
};

type ShareLocation = {
  host: string;
  path: string;
};

function normalize(host: string, path: string): { host: string; path: string } {
  return {
    host: host.trim().toLowerCase(),
    path: path
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("/")
      .toLowerCase(),
  };
}

export async function listMountedSmbShares(): Promise<MountLocation[]> {
  const { stdout } = await execFileAsync("/sbin/mount", []);
  const shares: MountLocation[] = [];

  for (const line of stdout.split("\n")) {
    const match = line.match(/^(.+) on (.+) \(([^)]*)\)$/);
    if (!match) continue;

    const [, source, mountPoint, options] = match;
    if (
      !options
        .split(",")
        .map((option) => option.trim())
        .includes("smbfs")
    )
      continue;

    const withoutSlashes = source.replace(/^\/\//, "");
    const afterAuth = withoutSlashes.includes("@")
      ? withoutSlashes.slice(withoutSlashes.indexOf("@") + 1)
      : withoutSlashes;
    const [host, ...pathParts] = afterAuth.split("/");
    if (!host) continue;

    shares.push({ host, path: pathParts.join("/"), mountPoint });
  }

  return shares;
}

export function findMountedShare(
  mounted: MountLocation[],
  entry: ShareLocation,
): MountLocation | undefined {
  const target = normalize(entry.host, entry.path);
  return mounted.find((share) => {
    const candidate = normalize(share.host, share.path);
    return candidate.host === target.host && candidate.path === target.path;
  });
}

export async function unmountShare(entry: ShareLocation): Promise<void> {
  const mounted = await listMountedSmbShares();
  const match = findMountedShare(mounted, entry);

  if (!match) {
    throw new Error("Share is not currently mounted.");
  }

  await execFileAsync("/usr/sbin/diskutil", ["unmount", match.mountPoint]);
}
