import { execFile } from "node:child_process";
import { env } from "../config";

export interface TmuxPane {
  paneId: string;
  sessionName: string;
  windowIndex: number;
}

export interface PaneContent extends TmuxPane {
  lines: string[];
}

function tmux(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("tmux", args, { env, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function getAllPanes(): Promise<TmuxPane[]> {
  // pane_id (%N) and window_index (a number) never contain spaces, so we can
  // put session_name last and split on the first two spaces only — the name may
  // contain spaces (and any separator byte; Raycast's exec strips control chars,
  // so an ASCII space is the only safe delimiter here)
  const stdout = await tmux(["list-panes", "-a", "-F", "#{pane_id} #{window_index} #{session_name}"]);

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const firstSpace = line.indexOf(" ");
      const secondSpace = line.indexOf(" ", firstSpace + 1);

      return {
        paneId: line.slice(0, firstSpace),
        windowIndex: Number(line.slice(firstSpace + 1, secondSpace)),
        sessionName: line.slice(secondSpace + 1),
      };
    });
}

export async function capturePane(paneId: string): Promise<string[]> {
  // -p prints to stdout, -J joins wrapped lines, -S - starts from the top of the scrollback
  const stdout = await tmux(["capture-pane", "-p", "-J", "-t", paneId, "-S", "-"]);

  return stdout.split("\n").map((line) => line.trimEnd());
}

export async function captureAllPanes(): Promise<PaneContent[]> {
  let panes: TmuxPane[];

  try {
    panes = await getAllPanes();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // No server means no panes, not a failure
    if (message.includes("no server running") || message.includes("error connecting")) {
      return [];
    }

    throw e;
  }

  const captured = await Promise.all(
    panes.map(async (pane) => {
      try {
        return { ...pane, lines: await capturePane(pane.paneId) };
      } catch {
        // A pane can close between listing and capture; skip it rather than
        // failing the whole search
        return null;
      }
    }),
  );

  return captured.filter((pane): pane is PaneContent => pane !== null);
}

export function selectWindow(sessionName: string, windowIndex: number): Promise<string> {
  return tmux(["select-window", "-t", `=${sessionName}:${windowIndex}`]);
}
