import { execSync } from "child_process";
import { IT2API_PATH, extendedPath } from "./it2api";

export interface Session {
  name: string;
  id: string;
  windowId: string;
  tabId: string;
}

const run = (args: string): string =>
  execSync(`"${IT2API_PATH}" ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, PATH: extendedPath },
  }).trim();

export const listSessions = (): Session[] => {
  const hierarchy = run("show-hierarchy");
  const sessions: Session[] = [];
  let currentWindowId = "";
  let currentTabId = "";

  for (const line of hierarchy.split("\n")) {
    const windowMatch = line.match(/^Window id=(\S+)/);
    const tabMatch = line.match(/^\s+Tab id=(\d+)/);
    const sessionMatch = line.match(/Session "([^"]*)" id=([^\s]+)/);

    if (windowMatch) currentWindowId = windowMatch[1];
    else if (tabMatch) currentTabId = tabMatch[1];
    else if (sessionMatch)
      sessions.push({ name: sessionMatch[1], id: sessionMatch[2], windowId: currentWindowId, tabId: currentTabId });
  }

  return sessions;
};

export const activateSession = (sessionId: string) => run(`activate session ${sessionId}`);

export const getFocusedSessionId = (): string | null => {
  const focus = run("show-focus");
  const match = focus.match(/Active session is: Session "[^"]*" id=([^\s]+)/);
  return match ? match[1] : null;
};

export const listColorPresets = (): string[] =>
  run("list-color-presets")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const getCurrentSessionProfile = (sessionId: string): string =>
  run(`get-profile-property ${sessionId} name`).trim();

export const setColorPreset = (profile: string, preset: string) => run(`set-color-preset "${profile}" "${preset}"`);

export const splitPane = (sessionId: string, vertical = false): string =>
  run(`split-pane ${vertical ? "--vertical" : ""} ${sessionId}`).trim();

export const sendText = (sessionId: string, text: string) =>
  run(`send-text ${sessionId} "${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
