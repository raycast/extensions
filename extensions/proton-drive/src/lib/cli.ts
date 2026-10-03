import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";
import { demoDownload, demoLink, demoList, demoUpload, isDemo } from "./demo";

export const ROOT = "/my-files";

type Decrypted = { ok: true; value: string } | { ok: false; error?: unknown };

/** Raw node as printed by `proton-drive fs list -j`. Only the fields we use. */
export interface RawNode {
  uid: string;
  parentUid?: string;
  name: Decrypted;
  type: "file" | "folder" | "album" | "photo";
  mediaType?: string;
  isShared?: boolean;
  isSharedByUrl?: boolean;
  creationTime?: string;
  modificationTime?: string;
  totalStorageSize?: number;
  activeRevision?: { uid: string; claimedSize?: number; claimedModificationTime?: string };
}

/** Normalized node used everywhere in the extension. */
export interface DriveNode {
  uid: string;
  name: string;
  path: string;
  parentPath: string;
  type: "file" | "folder";
  mediaType?: string;
  size?: number;
  modified?: string;
  created?: string;
  shared: boolean;
  sharedByUrl: boolean;
}

export class CliError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
  }
}

const CANDIDATES = [
  `${homedir()}/.local/bin/proton-drive`,
  "/opt/homebrew/bin/proton-drive",
  "/usr/local/bin/proton-drive",
];

export function cliPath(): string {
  const { cliPath } = getPreferenceValues<{ cliPath?: string }>();
  if (cliPath?.trim()) {
    const custom = cliPath.trim().replace(/^~(?=\/)/, homedir());
    if (!existsSync(custom)) {
      throw new CliError(
        "Proton Drive CLI not found",
        `Nothing at ${custom}. Fix the CLI Path in the extension preferences.`,
      );
    }
    return custom;
  }
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new CliError(
      "Proton Drive CLI not found",
      "Install it from proton.me/download/drive/cli or set its path in the extension preferences.",
    );
  }
  return found;
}

export function run(args: string[], timeout = 10 * 60_000): Promise<string> {
  const bin = cliPath();
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 256 * 1024 * 1024, timeout }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || stdout || error.message).trim();
        const loggedOut =
          /not (logged|signed) in|auth login|unauthori[sz]ed|no (active )?session|session (expired|not found)/i.test(
            detail,
          );
        reject(
          new CliError(
            loggedOut ? "Not signed in to Proton Drive" : firstLine(detail) || "Proton Drive CLI failed",
            loggedOut ? "Run `proton-drive auth login` in your terminal." : detail,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

function firstLine(text: string): string {
  return text.split("\n").find((l) => l.trim() && !/^=+$/.test(l.trim())) ?? "";
}

/** Escape a node name so it can be used as a path segment (see `proton-drive fs list --help`). */
export function joinPath(parent: string, name: string): string {
  return `${parent.replace(/\/$/, "")}/${name.replace(/\//g, "\\/")}`;
}

export function normalize(raw: RawNode, parentPath: string): DriveNode | undefined {
  if (raw.type !== "file" && raw.type !== "folder") return undefined;
  // Undecryptable names can still be addressed by UID.
  const name = raw.name.ok ? raw.name.value : raw.uid;
  return {
    uid: raw.uid,
    name: raw.name.ok ? raw.name.value : "(name unavailable)",
    path: raw.name.ok ? joinPath(parentPath, name) : `${parentPath}/${raw.uid}`,
    parentPath,
    type: raw.type,
    mediaType: raw.mediaType,
    size: raw.activeRevision?.claimedSize ?? raw.totalStorageSize,
    modified: raw.activeRevision?.claimedModificationTime ?? raw.modificationTime,
    created: raw.creationTime,
    shared: Boolean(raw.isShared || raw.isSharedByUrl),
    sharedByUrl: Boolean(raw.isSharedByUrl),
  };
}

/**
 * Folder listing for useCachedPromise. The mode is part of the arguments, hence of the cache key,
 * so demo and real listings never mix in Raycast's cache.
 */
export function listFolderCached(path: string, mode: "demo" | "live"): Promise<DriveNode[]> {
  void mode;
  return listFolder(path);
}

export async function listFolder(path: string): Promise<DriveNode[]> {
  if (isDemo()) return demoList(path);
  const out = await run(["filesystem", "list", "--json", path]);
  const raw = JSON.parse(out) as RawNode[];
  return raw.flatMap((r) => normalize(r, path) ?? []);
}

export interface TransferResult {
  transferredItems: number;
  skippedItems: number;
  failedItems: number;
  failures: unknown[];
}

export async function download(paths: string[], localFolder: string): Promise<TransferResult> {
  if (isDemo()) return demoDownload(paths, localFolder);
  const out = await run(["filesystem", "download", "--json", "-f", "rename", "-d", "rename", ...paths, localFolder]);
  return JSON.parse(out) as TransferResult;
}

export async function upload(localPaths: string[], parentPath: string): Promise<TransferResult> {
  if (isDemo()) return demoUpload(localPaths);
  const out = await run(["filesystem", "upload", "--json", "-f", "rename", "-d", "merge", ...localPaths, parentPath]);
  return JSON.parse(out) as TransferResult;
}

const PUBLIC_URL = /https:\/\/drive\.proton\.me\/urls\/[^\s"']+/;

export async function existingPublicLink(path: string): Promise<string | undefined> {
  if (isDemo()) return demoLink(path);
  const out = await run(["sharing", "status", "--json", path]);
  return out.match(PUBLIC_URL)?.[0];
}

export async function createPublicLink(path: string): Promise<string> {
  if (isDemo()) return demoLink(path);
  const out = await run(["sharing", "set-url", "--json", path]);
  const url = out.match(PUBLIC_URL)?.[0] ?? (await existingPublicLink(path));
  if (!url) throw new CliError("Public link created, but its URL was not returned", out);
  return url;
}
