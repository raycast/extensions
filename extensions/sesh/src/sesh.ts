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

export const UPGRADE_SESH_MESSAGE = "Please upgrade to the latest version of the sesh CLI";

export function getSessions() {
  return new Promise<Session[]>((resolve, reject) => {
    execFile("sesh", ["list", "--json"], { env: getEnv() }, (error, stdout, stderr) => {
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

export function isTmuxRunning(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    execFile("tmux", ["ls"], { env: getEnv() }, (error, _, stderr) => resolve(!(error || stderr)));
  });
}
