import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";

const OMNIWMCTL = "/opt/homebrew/bin/omniwmctl";

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function execute(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(OMNIWMCTL, args, { timeout: 5_000 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

type FocusedWindowSnapshot = {
  id?: string;
  mode?: "tiling" | "floating";
  layoutReason?: "standard" | "native-fullscreen";
  workspace?: { id?: string };
  frame?: { x: number; y: number; width: number; height: number };
  isFocused?: boolean;
};

async function windowSnapshots(): Promise<FocusedWindowSnapshot[]> {
  const output = await execute([
    "query",
    "windows",
    "--fields",
    "id,workspace,frame,mode,layout-reason,is-focused",
    "--format",
    "json",
  ]);
  const response = JSON.parse(output) as {
    result?: { payload?: { windows?: FocusedWindowSnapshot[] } };
  };
  return response.result?.payload?.windows ?? [];
}

async function focusedWindowSnapshot(): Promise<
  FocusedWindowSnapshot | undefined
> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const focusedOutput = await execute([
      "query",
      "focused-window",
      "--format",
      "json",
    ]);
    const focusedResponse = JSON.parse(focusedOutput) as {
      result?: { payload?: { window?: FocusedWindowSnapshot } };
    };
    const focused = focusedResponse.result?.payload?.window;
    const windows = await windowSnapshots();

    const workspaceOutput = await execute([
      "query",
      "workspaces",
      "--current",
      "--fields",
      "focused-window-id",
      "--format",
      "json",
    ]);
    const workspaceResponse = JSON.parse(workspaceOutput) as {
      result?: {
        payload?: { workspaces?: Array<{ focusedWindowId?: string }> };
      };
    };
    const workspaceFocusedId =
      workspaceResponse.result?.payload?.workspaces?.[0]?.focusedWindowId;
    const focusedId = focused?.id ?? workspaceFocusedId;

    if (focusedId) {
      const detailed = windows.find((window) => window.id === focusedId);
      if (detailed) return detailed;
      if (focused?.id === focusedId) return focused;
    }
    const flaggedFocused = windows.find((window) => window.isFocused);
    if (flaggedFocused) return flaggedFocused;
    await delay(80);
  }
  return undefined;
}

async function prepareFocusedWindowForTiling() {
  const window = await focusedWindowSnapshot();
  if (!window) throw new Error("OmniWM has no focused managed window");

  if (window.layoutReason === "native-fullscreen") {
    await execute(["command", "toggle-native-fullscreen"]);
  }
  if (window.mode === "floating") {
    await execute(["command", "toggle-focused-window-floating"]);
  }
}

async function ensureFocusedWindowIsStandalone() {
  const focused = await focusedWindowSnapshot();
  if (!focused?.id || !focused.workspace?.id || !focused.frame) {
    throw new Error("OmniWM could not inspect the focused window layout");
  }

  const tolerance = 2;
  const focusedFrame = focused.frame;
  const sharesColumn = (await windowSnapshots()).some(
    (window) =>
      window.id !== focused.id &&
      window.mode === "tiling" &&
      window.workspace?.id === focused.workspace?.id &&
      window.frame !== undefined &&
      Math.abs(window.frame.x - focusedFrame.x) <= tolerance &&
      Math.abs(window.frame.width - focusedFrame.width) <= tolerance,
  );

  if (sharesColumn) await execute(["command", "move", "right"]);
}

async function run(
  title: string,
  steps: string[][],
  prepareForTiling: boolean,
  makeStandalone: boolean,
) {
  await closeMainWindow();
  await delay(120);

  try {
    if (prepareForTiling) await prepareFocusedWindowForTiling();
    if (makeStandalone) await ensureFocusedWindowIsStandalone();
    for (const args of steps) await execute(args);
    await showHUD(title);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`OmniWM command failed: ${message}`);
    await showHUD(`OmniWM failed: ${message}`);
  }
}

export async function runOmniWM(title: string, steps: string[][]) {
  await run(title, steps, false, false);
}

export async function runTiledOmniWM(title: string, steps: string[][]) {
  await run(title, steps, true, false);
}

export async function runStandaloneTiledOmniWM(
  title: string,
  steps: string[][],
) {
  await run(title, steps, true, true);
}
