import {
  environment,
  launchCommand,
  LaunchType,
  updateCommandMetadata,
} from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

export const MENU_BAR_MODES = [
  {
    value: "always",
    label: "Always",
    description: "Hide the menu bar on the desktop and in full screen.",
  },
  {
    value: "desktop-only",
    label: "On Desktop Only",
    description: "Hide the menu bar on the desktop; show it in full screen.",
  },
  {
    value: "fullscreen-only",
    label: "In Full Screen Only",
    description: "Show the menu bar on the desktop; hide it in full screen.",
  },
  {
    value: "never",
    label: "Never",
    description: "Keep the menu bar visible everywhere.",
  },
] as const;

export type MenuBarMode = (typeof MENU_BAR_MODES)[number]["value"];

export interface MenuBarStatus {
  mode: MenuBarMode;
  label: string;
  message: string;
}

interface CommandFailure extends Error {
  stderr?: string;
  stdout?: string;
}

const execFileAsync = promisify(execFile);
const helperPath = path.join(environment.assetsPath, "menu-bar-auto-hide");

function parseStatus(output: string): MenuBarStatus {
  const message = output.trim();
  const match = /^Menu bar auto-hide:\s*(.+)$/m.exec(message);
  if (!match) throw new Error("Couldn’t read the current menu bar mode");

  const label = match[1];
  const mode = MENU_BAR_MODES.find((candidate) => candidate.label === label);
  if (!mode) throw new Error(`Unknown menu bar mode: ${label}`);

  return { mode: mode.value, label, message };
}

async function runHelper(args: string[], timeout: number) {
  const { stdout } = await execFileAsync("/bin/bash", [helperPath, ...args], {
    timeout,
    maxBuffer: 1024 * 1024,
  });
  return parseStatus(stdout);
}

export function readMenuBarStatus() {
  return runHelper(["status"], 5_000);
}

export function setMenuBarMode(mode: MenuBarMode) {
  return runHelper(["set", mode], 30_000);
}

export function toggleMenuBarModes(
  firstMode: MenuBarMode,
  secondMode: MenuBarMode,
) {
  return runHelper(["toggle", firstMode, secondMode], 30_000);
}

export async function updateCommandSubtitle(subtitle: string) {
  try {
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Couldn’t update command subtitle", error);
  }
}

export function updateStatusSubtitle(label: string) {
  return updateCommandSubtitle(`Current: ${label}`);
}

export async function refreshStatusSubtitle() {
  const status = await readMenuBarStatus();
  await updateStatusSubtitle(status.label);
  return status;
}

export async function refreshToggleCommandSubtitle() {
  try {
    await launchCommand({
      name: "toggle-menu-bar-auto-hide",
      type: LaunchType.Background,
    });
  } catch (error) {
    console.error("Couldn’t refresh toggle command subtitle", error);
  }
}

export function failureMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const commandError = error as CommandFailure;
  const output = commandError.stderr?.trim() || commandError.stdout?.trim();
  return output || commandError.message;
}
