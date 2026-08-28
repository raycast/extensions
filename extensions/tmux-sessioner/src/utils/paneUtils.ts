import { execFile } from "node:child_process";
import { env } from "../config";

export interface TmuxPane {
  paneId: string;
  sessionName: string;
  windowIndex: number;
  windowActivity: number;
  paneActive: boolean;
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
  // pane_id (%N), window_index and window_activity (numbers) never contain
  // spaces, so we put session_name last and split on the first three spaces —
  // the name may contain spaces (and any separator byte; Raycast's exec strips
  // control chars, so an ASCII space is the only safe delimiter here)
  const stdout = await tmux([
    "list-panes",
    "-a",
    "-F",
    "#{pane_id} #{window_index} #{window_activity} #{pane_active} #{session_name}",
  ]);

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const s1 = line.indexOf(" ");
      const s2 = line.indexOf(" ", s1 + 1);
      const s3 = line.indexOf(" ", s2 + 1);
      const s4 = line.indexOf(" ", s3 + 1);

      return {
        paneId: line.slice(0, s1),
        windowIndex: Number(line.slice(s1 + 1, s2)),
        windowActivity: Number(line.slice(s2 + 1, s3)),
        paneActive: line.slice(s3 + 1, s4) === "1",
        sessionName: line.slice(s4 + 1),
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

// Focus the exact matched pane: selecting its window activates the window,
// selecting the pane activates it within that window (a window may hold several)
export async function focusPane(paneId: string): Promise<void> {
  await tmux(["select-window", "-t", paneId]);
  await tmux(["select-pane", "-t", paneId]);
}
