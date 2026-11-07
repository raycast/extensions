import { runAppleScript } from "@raycast/utils";

export const DOWNLOAD_URL = "https://rapto.app";

const BUNDLE_IDS = ["app.rapto.mac", "app.rapto.mac.debug"];

export type RaptoWindow = {
  id: number;
  app: string;
  title: string;
  appPath?: string;
  desktop: number;
  isCurrentDesktop: boolean;
  display?: string;
};

export type Mode = "manualAssignment" | "autoTiling" | "dragSnap" | "none";

export type Layout = {
  id: string;
  name: string;
  isCustom: boolean;
  /** x, y, width, height relative to the screen, origin at the top left */
  zones: [number, number, number, number][];
};

export type DesktopInfo = {
  mode: Mode;
  display?: string;
  currentLayoutID?: string;
  modes: { id: Mode; name: string }[];
  layouts: Layout[];
};

export type Workspace = {
  id: string;
  name: string;
  apps: string[];
  displays: number;
};

export class RaptoNotRunningError extends Error {}

async function runningBundleID(): Promise<string> {
  const checks = BUNDLE_IDS.map(
    (id) => `try
  if application id "${id}" is running then return "${id}"
end try`,
  ).join("\n");
  const id = await runAppleScript(`${checks}\nreturn ""`);
  if (!id) throw new RaptoNotRunningError();
  return id;
}

// Raw event codes from Rapto.sdef, so the script compiles without Rapto's dictionary and works for both bundle ids
async function send(code: string, parameter?: string | number): Promise<string> {
  const id = await runningBundleID();
  const argument =
    parameter === undefined
      ? ""
      : typeof parameter === "number"
        ? " ((item 2 of argv) as integer)"
        : " (item 2 of argv)";
  const script = `on run argv
  tell application id (item 1 of argv) to return «event ${code}»${argument}
end run`;
  return runAppleScript(script, parameter === undefined ? [id] : [id, String(parameter)]);
}

export async function listWindows(): Promise<RaptoWindow[]> {
  return JSON.parse(await send("RptoLsWn")) as RaptoWindow[];
}

export async function focusWindow(windowID: number): Promise<boolean> {
  return (await send("RptoFcWn", windowID)) === "true";
}

export async function desktopInfo(): Promise<DesktopInfo> {
  return JSON.parse(await send("RptoDsIn")) as DesktopInfo;
}

export async function applyLayout(layoutID: string): Promise<boolean> {
  return (await send("RptoApLy", layoutID)) === "true";
}

export async function setMode(mode: Mode): Promise<boolean> {
  return (await send("RptoStMd", mode)) === "true";
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return JSON.parse(await send("RptoLsWs")) as Workspace[];
}

export async function openWorkspace(workspaceID: string): Promise<boolean> {
  return (await send("RptoOpWs", workspaceID)) === "true";
}

export async function launchRapto(): Promise<void> {
  await runAppleScript(`tell application id "${BUNDLE_IDS[0]}" to launch`);
}
