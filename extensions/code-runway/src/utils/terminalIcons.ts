import { Icon } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { TerminalType } from "../types";

const TERMINAL_APPS: Record<TerminalType, { appName: string; fallbackIcon: Icon }> = {
  ghostty: { appName: "Ghostty", fallbackIcon: Icon.CommandSymbol },
  iterm: { appName: "iTerm", fallbackIcon: Icon.Terminal },
  warp: { appName: "Warp", fallbackIcon: Icon.Terminal },
  cmux: { appName: "cmux", fallbackIcon: Icon.Terminal },
};

function getTerminalBundlePath(terminalType?: TerminalType): string | null {
  if (!terminalType) return null;

  const terminal = TERMINAL_APPS[terminalType];
  const bundleName = `${terminal.appName}.app`;
  const candidates = [join("/Applications", bundleName), join(homedir(), "Applications", bundleName)];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function getTerminalDisplayName(terminalType?: TerminalType): string {
  if (!terminalType) return "Terminal";
  return TERMINAL_APPS[terminalType].appName;
}

export function getTerminalIcon(terminalType?: TerminalType): Icon | { fileIcon: string } {
  if (!terminalType) return Icon.Terminal;

  const bundlePath = getTerminalBundlePath(terminalType);
  if (bundlePath) {
    return { fileIcon: bundlePath };
  }

  return TERMINAL_APPS[terminalType].fallbackIcon;
}
