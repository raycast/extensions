import { exec } from "child_process";
import { getEnv } from "./env";

const env = getEnv();

export interface Session {
  Src: string; // tmux or zoxide
  Name: string; // The display name
  Path: string; // The absolute directory path
  Score: number; // The score of the session (from Zoxide)
  Attached: number; // Whether the session is currently attached
  Windows: number; // The number of windows in the session
}

export function getSessions() {
  return new Promise<Session[]>((resolve, reject) => {
    exec(`sesh list --json`, { env }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error("stderr ", stderr);
        console.error("error ", error);
        return reject(`Please upgrade to the latest version of the sesh CLI`);
      }
      const sessions = JSON.parse(stdout);
      return resolve(sessions ?? []);
    });
  });
}

export function connectToSession(session: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(`sesh connect --switch "${session}"`, { env }, (error, _, stderr) => {
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
    exec(`tmux ls`, { env }, (error, _, stderr) => resolve(!(error || stderr)));
  });
}
