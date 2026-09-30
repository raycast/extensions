import { execFile } from "child_process";
import { getEnv } from "./env";

export interface Session {
  Src: string; // tmux or zoxide
  Name: string; // The display name
  Path: string; // The absolute directory path
  Score: number; // The score of the session (from Zoxide)
  Attached: number; // Whether the session is currently attached
  Windows: number; // The number of windows in the session
}

export interface Window {
  Name: string;
  Path: string;
  Index: number;
  Active: boolean;
}

export const UPGRADE_SESH_MESSAGE = "Please upgrade to the latest version of the sesh CLI";

export function getSessions({ tmuxOnly = false } = {}) {
  const args = ["list", "--json", ...(tmuxOnly ? ["--tmux"] : [])];
  return new Promise<Session[]>((resolve, reject) => {
    execFile("sesh", args, { env: getEnv() }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error("stderr ", stderr);
        console.error("error ", error);
        return reject(UPGRADE_SESH_MESSAGE);
      }
      try {
        const sessions = JSON.parse(stdout);
        return resolve(sessions ?? []);
      } catch {
        return reject(UPGRADE_SESH_MESSAGE);
      }
    });
  });
}

export function getSeshVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("sesh", ["--version"], { env: getEnv() }, (error, stdout) => {
      if (error && error.code === "ENOENT") {
        return resolve(null);
      }
      return resolve(stdout.trim());
    });
  });
}

export function connectToSession(session: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    execFile("sesh", ["connect", "--switch", session], { env: getEnv() }, (error, _, stderr) => {
      if (error || stderr) {
        console.error("error ", error);
        console.error("stderr ", stderr);
        return reject(error?.message ?? stderr);
      }
      return resolve();
    });
  });
}

export function getWindows(session: string) {
  return new Promise<Window[]>((resolve, reject) => {
    execFile("sesh", ["window", "list", "--json", "--target", session], { env: getEnv() }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error("stderr ", stderr);
        console.error("error ", error);
        return reject(error?.message ?? stderr);
      }
      try {
        return resolve(JSON.parse(stdout) ?? []);
      } catch (error) {
        return reject(error);
      }
    });
  });
}

export function connectToWindow(session: string, name: string, { create = false } = {}): Promise<void> {
  const args = ["window", "connect", "--switch", "--target", session, ...(create ? ["--new"] : []), "--", name];
  return new Promise<void>((resolve, reject) => {
    execFile("sesh", args, { env: getEnv() }, (error, _, stderr) => {
      if (error || stderr) {
        console.error("error ", error);
        console.error("stderr ", stderr);
        return reject(error?.message ?? stderr);
      }
      return resolve();
    });
  });
}

export function selectWindow(session: string, index: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // the = prefix makes tmux match the session name exactly
    execFile("tmux", ["select-window", "-t", `=${session}:${index}`], { env: getEnv() }, (error, _, stderr) => {
      if (error || stderr) {
        console.error("error ", error);
        console.error("stderr ", stderr);
        return reject(error?.message ?? stderr);
      }
      return resolve();
    });
  });
}

export async function switchToWindow(session: string, window: Window, sessionWindows: Window[]) {
  // sesh picks the lowest-indexed window when names repeat, target duplicates by index
  if (sessionWindows.filter((w) => w.Name === window.Name).length > 1) {
    await selectWindow(session, window.Index);
    await connectToSession(session);
  } else {
    await connectToWindow(session, window.Name);
  }
}

export function isTmuxRunning(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    execFile("tmux", ["ls"], { env: getEnv() }, (error, _, stderr) => resolve(!(error || stderr)));
  });
}
