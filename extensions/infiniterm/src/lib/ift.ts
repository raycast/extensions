import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { parseCards, parseWorkspaces, terminalArgs, type Card, type Workspace } from "./parse.ts";

const run = promisify(execFile);

// `ift terminal` may start the app first and waits up to 30s for it.
const LAUNCH_TIMEOUT_MS = 40_000;

function iftPath(): string {
  const { iftPath } = getPreferenceValues<Preferences>();
  return iftPath?.trim() || "/opt/homebrew/bin/ift";
}

// ift prints "ift: <reason>" on stderr; show that, not Node's "Command failed" wrapper.
function reason(e: unknown): Error {
  const stderr = (e as { stderr?: string }).stderr?.trim();
  return new Error(stderr || (e instanceof Error ? e.message : String(e)));
}

async function ift(args: string[], timeout = 10_000): Promise<string> {
  try {
    return (await run(iftPath(), args, { timeout })).stdout;
  } catch (e) {
    throw reason(e);
  }
}

// An ift without a verb treats `ift <verb>` as a path and opens an editor card for it,
// so ask the help text (local, no side effects) before sending a verb that may be new.
async function supportsVerb(verb: string): Promise<boolean> {
  try {
    return new RegExp(`^\\s*ift ${verb}\\b`, "m").test(await ift(["--help"]));
  } catch {
    return false;
  }
}

const supportsWorkspaces = () => supportsVerb("workspaces");
export const supportsFocus = () => supportsVerb("focus");

// Fails when the app is not running or is too old to know the verb.
export async function listWorkspaces(): Promise<Workspace[]> {
  if (!(await supportsWorkspaces())) throw new Error("This ift has no `workspaces` verb yet");
  return parseWorkspaces(await ift(["workspaces"]));
}

async function appIsRunning(): Promise<boolean> {
  try {
    await ift(["ls"]);
    return true;
  } catch {
    return false;
  }
}

// Only `ift terminal` starts the app itself; `ift -n` and `ift diff` fail when it is closed.
// Bare `ift` launches it (or focuses it), then wait for its socket.
async function ensureRunning(): Promise<void> {
  if (await appIsRunning()) return;
  await ift([]);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await appIsRunning()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("infiniterm did not start");
}

// The work runs while the Raycast window is still open, behind a toast: a view command's process can be torn down
// once its window closes, which dropped everything queued after closeMainWindow. showHUD closes the window itself
// when the work is done; on failure the toast turns red and the window stays open.
// `activate` brings infiniterm in front afterwards: the verbs that open a card do not, so with Finder in front
// the new card would appear behind it and nothing would seem to happen. Bare `ift` focuses the running app.
async function perform(hud: string, failTitle: string, action: () => Promise<void>, activate = false): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening in infiniterm…" });
  try {
    await action();
    if (activate) await ift([]);
    await showHUD(hud);
  } catch (e) {
    console.error(`[infiniterm] ${failTitle}:`, e);
    toast.style = Toast.Style.Failure;
    toast.title = failTitle;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

export async function openFolders(dirs: string[], workspace?: string, name?: string): Promise<void> {
  await perform(
    dirs.length === 1 ? "Opened in infiniterm" : `Opened ${dirs.length} folders in infiniterm`,
    "Could not open in infiniterm",
    async () => {
      // An ift before the workspace flags reads `--` as a directory, so send it only to one that has them.
      const newIft = await supportsWorkspaces();
      await ift(terminalArgs(dirs, workspace, name, newIft), LAUNCH_TIMEOUT_MS);
    },
    true,
  );
}

// Each file in an editor card of its own; `-n` returns at once instead of waiting for the card to close.
export async function openFiles(paths: string[]): Promise<void> {
  await perform(
    paths.length === 1 ? "Opened file in infiniterm" : `Opened ${paths.length} files in infiniterm`,
    "Could not open in infiniterm",
    async () => {
      await ensureRunning();
      for (const p of paths) await ift(["-n", p]);
    },
    true,
  );
}

// Every card on the canvas, across workspaces. Fails when the app is not running.
export async function listCards(): Promise<Card[]> {
  return parseCards(await ift(["ls"]));
}

// Types into a card's shell without moving the focus. The card is its id, which does not change
// the way a card number can.
export async function sendToCard(card: Card, text: string, enter: boolean): Promise<void> {
  await perform(`Sent to card #${card.number}`, "Could not send to card", async () => {
    await ift(["send", card.id, text, ...(enter ? ["--enter"] : [])]);
  });
}

// Switches to the card's workspace, focuses and fits it, then brings the app in front of other apps:
// `ift focus` does not do that, bare `ift` does.
export async function focusCard(card: Card): Promise<void> {
  await perform(`Went to card #${card.number}`, "Could not go to card", async () => {
    if (!(await supportsFocus())) throw new Error("This ift has no `focus` verb yet");
    await ift(["focus", card.id]);
    await ift([]);
  });
}

// Changes against git HEAD as a card; a file or a directory.
export async function openDiffs(paths: string[]): Promise<void> {
  await perform(
    "Opened diff in infiniterm",
    "Could not open diff in infiniterm",
    async () => {
      await ensureRunning();
      for (const p of paths) await ift(["diff", p]);
    },
    true,
  );
}
