import { Clipboard, closeMainWindow, environment, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import type { App } from "../lib/input";
import { homedir } from "node:os";
import { FABRIC_DIR, PATTERNS_DIR } from "../lib/loaders";
import { notifyArgv } from "../lib/macos";
import { raycastReaders } from "./input-source";
import { prefs } from "./storage";
import { deliver, type OutputMode, outputFileName } from "../lib/output";
import { refusedFolders, scrubHome, tildify, writeNewFile } from "../lib/paths";

/** Every path the UI shows goes through here; actions that open or reveal a file keep the real one. */
// HOME first: Bun's homedir() ignores a HOME set at runtime, which the render tests rely on.
export const shownPath = (path: string) => tildify(path, process.env.HOME || homedir());

/** Text a toast or view shows that may quote a path (fabric's stderr, an error): home becomes `~`. */
export const shownText = (text: string) => scrubHome(text, process.env.HOME || homedir());

/** An error's message as a toast or view shows it; a thrown non-Error shows as text. */
export const errorText = (e: unknown) => shownText(e instanceof Error ? e.message : String(e));

/** fabric's built-in patterns folder: the root every write guard protects. */
export const PATTERNS_ROOT = PATTERNS_DIR;
/** Where no answer is saved, by any route (Save to File, Save as…, a background run). */
export const ANSWER_REFUSED = refusedFolders(homedir(), FABRIC_DIR);
export const PROFILES_DIR = join(environment.supportPath, "profiles");
/** Chains (fabric workflow JSON) live with the extension, never in fabric's folder. */
export const WORKFLOWS_DIR = join(environment.supportPath, "workflows");

/** Saves to the Save Folder as Preferences hold it now, not as they were when the run started. */
export function saveAnswer(text: string, pattern: string | undefined, subject?: string): string {
  const folder = prefs().outputFolder;
  if (!folder) throw new Error("Set a Save Folder in the extension's Preferences first.");
  return writeNewFile(folder, outputFileName(pattern, subject, new Date()), text, PATTERNS_ROOT, ANSWER_REFUSED);
}

export const notify = (text: string) =>
  new Promise<void>((done) => {
    const [cmd, args] = notifyArgv(text);
    execFile(cmd, args, () => done());
  });

/** Delivers the answer and returns what was done, or undefined when it failed (a Toast says why). */
export async function deliverAnswer(
  text: string,
  mode: OutputMode,
  opts: { target?: App; pattern?: string; subject?: string },
): Promise<string | undefined> {
  try {
    return await deliver(text, mode, opts.target, {
      copy: (t) => Clipboard.copy(t),
      paste: async (t) => {
        await closeMainWindow();
        await Clipboard.paste(t);
      },
      frontmostApp: raycastReaders.frontmostApp,
      save: async (t) => shownPath(saveAnswer(t, opts.pattern, opts.subject)),
      notice: notify,
      toast: async (title, message) => void (await showToast({ style: Toast.Style.Success, title, message })),
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't deliver the answer",
      message: errorText(e),
    });
  }
}
