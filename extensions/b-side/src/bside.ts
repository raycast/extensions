import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";

/**
 * B-Side takes commands as `bside://<command>` URLs (WidgetCommand in the
 * app). It starts the app when it is not running. `open -g` leaves B-Side
 * in the background; only Show brings it forward.
 */
type Command = "toggle" | "next" | "previous" | "vibe" | "show" | "like";

export async function send(command: Command, hud: string, query = "") {
  const url = `bside://${command}${query}`;
  const args = command === "show" ? [url] : ["-g", url];
  try {
    await run("open", args);
  } catch (error) {
    // -10814: no app claims bside://, so B-Side is not installed.
    const missing = String(error).includes("-10814");
    await showToast({
      style: Toast.Style.Failure,
      title: missing ? "B-Side is not installed" : "Could not reach B-Side",
      message: missing ? "Get it at b-side.anhile.com" : String(error),
    });
    return;
  }
  await closeMainWindow();
  if (command !== "show") await showHUD(hud);
}

/** A vibe tile, as B-Side saves it (Mood in the app). */
export type Vibe = {
  id: string;
  name: string;
  heardAs?: string;
  source: {
    likedShuffled?: Record<string, never>;
    playlist?: { id: string; shuffled: boolean };
    radio?: { videoID: string };
    described?: { prompt: string; anchors: string[] };
  };
};

const LIKED: Vibe = { id: "liked", name: "Liked Music", source: { likedShuffled: {} } };

/**
 * The tiles of the Vibe page, read from B-Side's preferences, where they
 * are kept as JSON under "moods". Until the tiles are changed nothing is
 * saved, and the page shows Liked Music alone.
 */
export async function loadVibes(): Promise<Vibe[]> {
  try {
    const plist = await run("defaults", ["export", "com.anhile.bside", "-"]);
    const base64 = await run("plutil", ["-extract", "moods", "raw", "-o", "-", "-"], plist);
    return JSON.parse(Buffer.from(base64.trim(), "base64").toString("utf8")) as Vibe[];
  } catch {
    return [LIKED];
  }
}

/** What a tile says under its name in B-Side. */
export function subtitle(vibe: Vibe): string {
  const { source } = vibe;
  if (source.likedShuffled) return "Shuffled";
  if (source.playlist) return source.playlist.shuffled ? "Playlist, shuffled" : "Playlist";
  if (source.radio) return "Radio";
  return vibe.heardAs || "From words";
}

function run(command: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) =>
      error ? reject(new Error(stderr.trim() || error.message)) : resolve(stdout),
    );
    if (input !== undefined) child.stdin?.end(input);
  });
}
