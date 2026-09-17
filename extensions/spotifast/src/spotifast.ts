import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export class SpotifastNotInstalledError extends Error {
  constructor() {
    super("Spotifast is not installed");
    this.name = "SpotifastNotInstalledError";
  }
}

export class SpotifastNotRunningError extends Error {
  constructor() {
    super("Spotifast is not running");
    this.name = "SpotifastNotRunningError";
  }
}

export type RepeatMode = "off" | "context" | "track";

export type NowPlaying = {
  state: "playing" | "paused";
  title: string;
  artists: string;
  album: string;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  artUrl?: string;
  /** Undefined when the running build does not report it. */
  saved?: boolean;
  device?: string;
};

export type Device = {
  id: string;
  name: string;
  kind: string;
  active: boolean;
};

const BUNDLE_ID = "me.paolino.fastpotify";

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Spotifast.app still ships its executable as `fastpotify`, and installs
// updated from before the rename keep the Fastpotify.app bundle path. Raycast
// does not inherit the login shell's PATH, so the usual command locations are
// listed outright.
function binaryCandidates(): string[] {
  const home = homedir();
  const bundles = ["/Applications", join(home, "Applications")].flatMap((dir) =>
    ["Spotifast.app", "Fastpotify.app"].map((app) => join(dir, app, "Contents/MacOS/fastpotify")),
  );
  const binDirs = ["/opt/homebrew/bin", "/usr/local/bin", join(home, ".cargo/bin"), join(home, ".nix-profile/bin")];
  const commands = binDirs.flatMap((dir) => ["spotifast", "fastpotify"].map((name) => join(dir, name)));
  return [...bundles, ...commands];
}

export function findBinary(): string {
  const { binaryPath } = getPreferenceValues<Preferences>();
  const configured = binaryPath?.trim();
  if (configured) {
    if (!isExecutable(configured)) throw new SpotifastNotInstalledError();
    return configured;
  }
  const found = binaryCandidates().find(isExecutable);
  if (!found) throw new SpotifastNotInstalledError();
  return found;
}

export function run(...args: string[]): Promise<string> {
  const binary = findBinary();
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: 5000 }, (error, stdout, stderr) => {
      if (!error) return resolve(stdout);
      if (stderr.includes("not running")) return reject(new SpotifastNotRunningError());
      reject(new Error(stderr.trim() || error.message));
    });
  });
}

// With nothing playing the app answers with a single word and no fields.
export function parseNowPlaying(snapshot: string): NowPlaying | null {
  const fields = snapshot.replace(/\n$/, "").split("\t");
  const [state, title, artists, album, position, duration, volume, shuffle, repeat, artUrl, saved, device] = fields;
  if (state !== "playing" && state !== "paused") return null;
  return {
    state,
    title: title ?? "",
    artists: artists ?? "",
    album: album ?? "",
    positionMs: Number(position) || 0,
    durationMs: Number(duration) || 0,
    volume: Number(volume) || 0,
    shuffle: shuffle === "on",
    repeat: repeat === "context" || repeat === "track" ? repeat : "off",
    artUrl: artUrl || undefined,
    saved: saved === "yes" ? true : saved === "no" ? false : undefined,
    device: device || undefined,
  };
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  return parseNowPlaying(await run("now-playing", "--raw"));
}

export async function getDevices(): Promise<Device[]> {
  const devices: Partial<Device>[] = JSON.parse(await run("devices", "--raw"));
  return devices.map((device) => ({
    id: device.id ?? "",
    name: device.name ?? "",
    kind: device.kind ?? "",
    active: device.active ?? false,
  }));
}

/**
 * Runs a verb, then waits until the app reports the change it causes.
 *
 * The app acknowledges a command before its playback state reflects it, so
 * reading the state straight away would show what was playing before.
 */
export async function runAndSettle(
  args: string[],
  changed: (before: NowPlaying | null, after: NowPlaying | null) => boolean,
): Promise<NowPlaying | null> {
  const before = await getNowPlaying();
  await run(...args);
  let after = before;
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    after = await getNowPlaying();
    if (changed(before, after)) break;
  }
  return after;
}

/** Brings the window forward, launching the app when no instance answers. */
export async function openSpotifast(): Promise<void> {
  try {
    await run("show");
  } catch (error) {
    if (error instanceof SpotifastNotInstalledError) throw error;
    await new Promise<void>((resolve, reject) =>
      execFile("open", ["-b", BUNDLE_ID], (openError) =>
        openError ? reject(new SpotifastNotInstalledError()) : resolve(),
      ),
    );
  }
}

export function formatTrack(track: NowPlaying): string {
  return track.artists ? `${track.title} — ${track.artists}` : track.title;
}

export function formatRepeat(mode: RepeatMode): string {
  return { off: "Repeat Off", context: "Repeat All", track: "Repeat One" }[mode];
}
