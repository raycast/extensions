import { exec } from "child_process";
import { env } from "./env";

export function getSessions() {
  return new Promise<string[]>((resolve, reject) => {
    exec(`sesh list`, { env }, (error, stdout, stderr) => {
      if (error || stderr) {
        return reject(error?.message ?? stderr);
      }
      const sessions = stdout.trim().split("\n");
      return resolve(sessions ?? []);
    });
  });
}

export function connectToSession(session: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(`sesh connect --switch ${session}`, { env }, (error, _, stderr) => {
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
