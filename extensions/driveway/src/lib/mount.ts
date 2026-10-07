import { execFile } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import type { Protocol, Share } from "./share";

const CONNECTION_TIMEOUT_MS = 2_000;
const execFileAsync = promisify(execFile);

// Used only for the reachability check; mounting resolves its own port.
const PROTOCOL_PORT: Record<Protocol, number> = {
  smb: 445,
  webdav: 443,
  "webdav-http": 80,
};

// Split off an optional ":port" so the check hits the right port.
function splitHostPort(host: string): { hostname: string; port?: number } {
  const match = host.match(/^(.+):(\d{1,5})$/);
  return match ? { hostname: match[1], port: Number(match[2]) } : { hostname: host };
}

export function isReachable(host: string, protocol: Protocol = "smb"): Promise<boolean> {
  const { hostname, port } = splitHostPort(host);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port: port ?? PROTOCOL_PORT[protocol] });
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

// Only AppleScript's `mount volume` matches Finder's Cmd+K: silent
// reconnect on a cached credential, interactive trust prompt for a
// self-signed cert. It can block on a dialog, hence the long timeout.
const APPLESCRIPT_MOUNT_TIMEOUT_MS = 90_000;

export async function mountShare(share: Share): Promise<void> {
  const script = `mount volume ${JSON.stringify(share.url)}`;
  try {
    await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: APPLESCRIPT_MOUNT_TIMEOUT_MS });
  } catch (error) {
    const execError = error as { killed?: boolean; stderr?: string };
    // Every caller already names the drive, and osascript's own text is script
    // offsets and an OSStatus code, so that goes to the log and the throw
    // carries a cause a person can read.
    console.error("mount volume failed", execError.stderr?.trim() || error);

    if (execError.killed) {
      throw new Error(
        `Timed out after ${APPLESCRIPT_MOUNT_TIMEOUT_MS / 1000}s. If macOS asked for a password or to trust a certificate, try again and answer it promptly.`,
      );
    }
    throw new Error("The server refused the mount.");
  }
}

export class UnreachableError extends Error {}

// Shared by every mount entry point. No toasts or state; callers present.
export async function connectShare(share: Share): Promise<void> {
  if (!(await isReachable(share.host, share.protocol))) {
    throw new UnreachableError(`${share.label} is unreachable`);
  }
  await mountShare(share);
}

// `mount` can't tell https WebDAV from http WebDAV: both report the same
// fstype. So mounts are matched by family, not by the full protocol.
export type MountFamily = "smb" | "webdav";

export function mountFamily(protocol: Protocol = "smb"): MountFamily {
  return protocol === "smb" ? "smb" : "webdav";
}

export type MountLocation = {
  host: string;
  path: string;
  mountPoint: string;
  family: MountFamily;
};

export type ShareLocation = {
  host: string;
  // Undefined for a browse-only entry; never matches a mounted share.
  path?: string;
  // Absent on older entries; treated as "smb", as everywhere else.
  protocol?: Protocol;
};

// Mirrors serverIdentity in lib/share.ts: SMB share names are
// case-insensitive, WebDAV URL paths usually are not. The two have to agree,
// or a drive can count as distinct when saved yet match another's mount.
function normalize(host: string, path: string | undefined, family: MountFamily): { host: string; path: string } {
  const segments = (path ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  return {
    host: host.trim().toLowerCase(),
    path: family === "smb" ? segments.toLowerCase() : segments,
  };
}

// The fstype each protocol reports in `mount` output. Verified against
// real mounts; WebDAV reports "webdav", not "webdav_fs".
const MOUNT_FS_TYPE: Record<Protocol, string> = {
  smb: "smbfs",
  webdav: "webdav",
  // Same mechanism as "webdav"; only the URL scheme differs.
  "webdav-http": "webdav",
};
const MOUNT_FS_TYPES = new Set(Object.values(MOUNT_FS_TYPE));

// Split out so it can be tested against fabricated `mount` output.
export function parseMountOutput(stdout: string): MountLocation[] {
  const shares: MountLocation[] = [];

  for (const line of stdout.split("\n")) {
    const match = line.match(/^(.+) on (.+) \(([^)]*)\)$/);
    if (!match) continue;

    const [, source, mountPoint, options] = match;
    const optionList = options.split(",").map((option) => option.trim());
    const fsType = optionList.find((option) => MOUNT_FS_TYPES.has(option));
    if (!fsType) continue;

    // WebDAV sources are full URLs; strip any scheme, then the "//".
    const withoutScheme = source.replace(/^[a-z][a-z0-9+.-]*:/i, "");
    const withoutSlashes = withoutScheme.replace(/^\/\//, "");
    const afterAuth = withoutSlashes.includes("@")
      ? withoutSlashes.slice(withoutSlashes.indexOf("@") + 1)
      : withoutSlashes;
    const [host, ...pathParts] = afterAuth.split("/");
    if (!host) continue;

    shares.push({
      host,
      path: pathParts.join("/"),
      mountPoint,
      family: fsType === MOUNT_FS_TYPE.smb ? "smb" : "webdav",
    });
  }

  return shares;
}

// Opens a mounted volume in Finder. Not through a shell: a volume name can
// contain a quote, a space, a dollar sign or a backtick, and interpolating one
// into `open "<path>"` would either mangle the path or hand it to sh to
// evaluate.
export function openMountPoint(mountPoint: string): void {
  execFile("/usr/bin/open", [mountPoint], (error) => {
    if (error) console.error("open failed", error);
  });
}

export async function listMountedShares(): Promise<MountLocation[]> {
  const { stdout } = await execFileAsync("/sbin/mount", []);
  return parseMountOutput(stdout);
}

export function findMountedShare(mounted: MountLocation[], entry: ShareLocation): MountLocation | undefined {
  const family = mountFamily(entry.protocol);
  const target = normalize(entry.host, entry.path, family);
  return mounted.find((share) => {
    if (share.family !== family) return false;
    const candidate = normalize(share.host, share.path, family);
    return candidate.host === target.host && candidate.path === target.path;
  });
}

export async function unmountShare(entry: ShareLocation): Promise<void> {
  const mounted = await listMountedShares();
  const match = findMountedShare(mounted, entry);

  if (!match) {
    throw new Error("Share is not currently mounted.");
  }

  try {
    await execFileAsync("/usr/sbin/diskutil", ["unmount", match.mountPoint]);
  } catch (error) {
    console.error("diskutil unmount failed", (error as { stderr?: string }).stderr?.trim() || error);
    throw new Error("Something on the drive is still in use.");
  }
}
