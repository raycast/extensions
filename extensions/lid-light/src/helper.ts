import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const uid = process.getuid?.();
const socketDirectory = `/tmp/raycast-lid-light-${uid}`;
const socketPath = join(socketDirectory, "control.sock");
const helperApp = join(environment.assetsPath, "Lid Light Helper.app");

export const effects = {
  none: "Steady",
  breathe: "Breathe",
  pulse: "Pulse",
  heartbeat: "Heartbeat",
  sound: "Sound",
} as const;
export type Effect = keyof typeof effects;

export interface State {
  supported: boolean;
  originalRunning: boolean;
  setting?: "on" | "off";
  glow: number;
  direct: boolean;
  soundAvailable: boolean;
  lidAvailable: boolean;
  brightness: number;
  chosenBrightness: number;
  effect: Effect;
  battery: boolean;
  charging: boolean;
  chargingNow: boolean;
  lid: boolean;
  lidKeepsMacAwake: boolean;
  morse?: string;
  morseLoops: boolean;
  lastMorse: string;
  login: boolean;
  soundError?: string;
}

export type Request =
  | { operation: "status" | "toggle" | "takeOver" | "quit" | "stopMorse" }
  | { operation: "battery" | "charging" | "lid" | "login"; enabled?: boolean }
  | { operation: "brightness"; level: number }
  | { operation: "effect"; effect: Effect }
  | { operation: "morse"; text: string; loops: boolean };

interface Reply {
  state?: State;
  error?: string;
}

class HelperUnavailable extends Error {}

async function exchange(request: Request): Promise<State> {
  try {
    const info = await lstat(socketDirectory);
    if (!info.isDirectory() || info.uid !== uid || (info.mode & 0o777) !== 0o700) {
      throw new Error("The Lid Light helper’s connection directory is invalid.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new HelperUnavailable();
    throw error;
  }

  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    let response = "";

    socket.setEncoding("utf8");
    socket.setTimeout(request.operation === "toggle" ? 120_000 : 8_000);
    socket.once("connect", () => socket.write(JSON.stringify(request) + "\n"));
    socket.once("timeout", () => socket.destroy(new Error("The Lid Light helper did not respond.")));
    socket.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
        reject(new HelperUnavailable());
      } else {
        reject(error);
      }
    });
    socket.once("close", () => reject(new Error("The Lid Light helper closed the connection.")));
    socket.on("data", (chunk: string) => {
      response += chunk;
      if (response.length > 8192) {
        socket.destroy(new Error("The Lid Light helper returned an oversized response."));
        return;
      }
      const end = response.indexOf("\n");
      if (end === -1) return;
      try {
        const reply: Reply = JSON.parse(response.slice(0, end));
        if (!reply.state) throw new Error(reply.error ?? "The Lid Light helper returned an invalid response.");
        resolve(reply.state);
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
  });
}

export async function send(request: Request, launch = true): Promise<State> {
  try {
    return await exchange(request);
  } catch (error) {
    if (!(error instanceof HelperUnavailable)) throw error;
    if (!launch) throw new Error("The Lid Light helper is stopped.");
  }

  try {
    await run("/usr/bin/open", ["-g", helperApp], { timeout: 5_000 });
  } catch (error) {
    throw new Error(`Couldn’t open the Lid Light helper. ${errorMessage(error)}`);
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    await delay(150);
    try {
      return await exchange(request);
    } catch (error) {
      if (!(error instanceof HelperUnavailable)) throw error;
    }
  }
  throw new Error("The Lid Light helper did not start. Rebuild the extension and try again.");
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
