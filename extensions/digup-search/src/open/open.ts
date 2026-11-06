import type { Hit } from "../digup/protocol";
import { clock } from "../search/presentation";
import { codeLine, editorPlan, type EditorPlan, type InstalledEditor } from "./editors";
import { landmark } from "./landmark";
import {
  IINA,
  iinaLink,
  jumpsToMoments,
  momentOf,
  pageOf,
  previewSearchArguments,
  QUICKTIME,
  quickTimeArguments,
  quickTimePlays,
  VLC,
  vlcArguments,
  vlcLaunchArguments,
} from "./moments";

export type OpenAction =
  | { type: "editor"; plan: EditorPlan; name: string }
  | { type: "quicktime"; seconds: number }
  | { type: "iina"; seconds: number }
  | { type: "vlc"; seconds: number }
  | { type: "pdf-search"; words: string }
  /** In an app that isn't the file's default and can't be told where to start. */
  | { type: "app"; appPath: string }
  | { type: "plain" };

/** An app, as Raycast describes one. */
export interface Player {
  bundleId?: string;
  path: string;
}

export interface OpenContext {
  /** Bundle id of the app that opens this file by default. */
  defaultApp?: string;
  /** The app chosen for videos and recordings in the extension's settings (QuickTime Player, unless changed). */
  player?: Player | null;
  editor?: InstalledEditor | null;
  editorExecutable?: string;
  /** The text of the PDF page that matched. */
  pageText?: string | null;
  /** The query's words. */
  words: string[];
}

/** How a result opens: code in the editor at its line, a recording at its moment, a PDF with a word from its page. */
export function planOpen(hit: Hit, context: OpenContext): OpenAction {
  if (hit.kind === "code") {
    if (!context.editor) return { type: "plain" };
    const plan = editorPlan(context.editor, hit.path, codeLine(hit), context.editorExecutable);
    return { type: "editor", plan, name: context.editor.editor.name };
  }
  if (hit.kind === "video" || hit.kind === "audio") {
    const player = playerFor(hit, context);
    const moment = momentOf(hit);
    if (moment !== null && player.bundleId === QUICKTIME) return { type: "quicktime", seconds: moment };
    if (moment !== null && player.bundleId === IINA) return { type: "iina", seconds: moment };
    if (moment !== null && player.bundleId === VLC) return { type: "vlc", seconds: moment };
    return player.appPath ? { type: "app", appPath: player.appPath } : { type: "plain" };
  }
  const page = pageOf(hit);
  if (page !== null && page > 1 && context.pageText) {
    const words = landmark(context.pageText, context.words);
    if (words) return { type: "pdf-search", words };
  }
  return { type: "plain" };
}

/**
 * The app a video or a recording opens in: the one chosen in the extension's settings. When that is QuickTime
 * Player and the file is of a kind it can't play (or when nothing is chosen), the file's default app, which a plain
 * open reaches without its path.
 */
function playerFor(
  hit: Hit,
  context: Pick<OpenContext, "defaultApp" | "player">,
): { bundleId?: string; appPath?: string } {
  const chosen = context.player;
  if (chosen && (chosen.bundleId !== QUICKTIME || quickTimePlays(hit.path))) {
    return { bundleId: chosen.bundleId, appPath: chosen.path };
  }
  return { bundleId: context.defaultApp };
}

/** "Open at 0:06" when the player that will be used can be told the moment, "Open in Zed" for code, else "Open". */
export function openTitle(hit: Hit, context: Pick<OpenContext, "defaultApp" | "player" | "editor">): string {
  if (hit.kind === "code") return context.editor ? `Open in ${context.editor.editor.name}` : "Open";
  const moment = momentOf(hit);
  return moment !== null && jumpsToMoments(playerFor(hit, context).bundleId) ? `Open at ${clock(moment)}` : "Open";
}

export interface Effects {
  /** Opens a file or a URL, in an app when one is given. */
  open(target: string, appPath?: string): Promise<void>;
  /** Runs a program. `ok` is false when it couldn't run or exited with an error. */
  exec(program: string, args: string[]): Promise<{ ok: boolean; stdout: string }>;
}

/** Opens `path` the way `action` says; when that fails, opens it plainly. Says which it was. */
export async function runOpen(action: OpenAction, path: string, effects: Effects): Promise<"jumped" | "plain"> {
  switch (action.type) {
    case "editor": {
      if (action.plan.type === "url") {
        try {
          await effects.open(action.plan.url);
          return "jumped";
        } catch {
          break; // nothing takes the editor's link any more: the file's default app gets it
        }
      }
      if ((await effects.exec(action.plan.program, action.plan.args)).ok) return "jumped";
      await effects.open(path, action.plan.appPath);
      return "plain";
    }
    case "iina":
      try {
        await effects.open(iinaLink(path, action.seconds));
        return "jumped";
      } catch {
        break; // IINA is gone and nothing takes its link: the file's default app gets it
      }
    case "quicktime":
      if ((await effects.exec("/usr/bin/osascript", quickTimeArguments(path, action.seconds))).ok) return "jumped";
      break;
    case "vlc": {
      // VLC takes the start time as an argument, which needs no permission to control it. But arguments reach an
      // app only as it starts: a VLC that's already running is told the time by script instead (starting another
      // VLC for every result would leave them piling up, all playing).
      const running = (await effects.exec("/usr/bin/pgrep", ["-x", "VLC"])).ok;
      const told = running
        ? await effects.exec("/usr/bin/osascript", vlcArguments(path, action.seconds))
        : await effects.exec("/usr/bin/open", vlcLaunchArguments(path, action.seconds));
      if (told.ok) return "jumped";
      break;
    }
    case "pdf-search": {
      const result = await effects.exec("/usr/bin/osascript", previewSearchArguments(path, action.words));
      if (result.ok && result.stdout.trim() === "sent") return "jumped";
      break;
    }
    case "app":
      try {
        await effects.open(path, action.appPath);
        return "plain";
      } catch {
        break; // the chosen app can't take this file, or is gone: its default app gets it
      }
    case "plain":
      break;
  }
  await effects.open(path);
  return "plain";
}
