import { getApplications } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface CactusConfiguration {
  domains: string[];
  focusStartMinutes: number;
  accessStartMinutes: number;
  activeWeekdays?: number[];
}

export interface CactusStatus {
  state: "attention" | "protectionPreserved" | "notConfigured" | "protected" | "access";
  isProtected: boolean;
  hasProtectionMismatch: boolean;
  configuration?: CactusConfiguration;
  nextTransition?: string;
  nextTransitionKind?: "blocking" | "access";
  pendingChangesApplyAt?: string;
}

export interface ConfigureRequest {
  domains: string[];
  focusStartMinutes: number;
  accessStartMinutes: number;
  activeWeekdays: number[];
}

export async function readStatus(): Promise<CactusStatus> {
  return JSON.parse(await runControl(["status"])) as CactusStatus;
}

export async function configure(request: ConfigureRequest): Promise<CactusStatus> {
  return JSON.parse(await runControl(["configure"], JSON.stringify(request))) as CactusStatus;
}

export async function cactusAppPath(): Promise<string> {
  const app = (await getApplications()).find(({ bundleId }) => bundleId === "app.cactus");
  if (!app) throw new Error("Cactus is not installed. Download it from usecactus.app.");
  return app.path;
}

async function controlPath(): Promise<string> {
  const path = resolve(await cactusAppPath(), "Contents", "Resources", "cactusctl");
  if (!existsSync(path)) throw new Error("Install the latest version of Cactus, then try again.");
  return path;
}

async function runControl(arguments_: string[], input?: string): Promise<string> {
  const path = await controlPath();
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(path, arguments_, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      rejectPromise(new Error("Cactus did not reply within five seconds."));
    }, 5_000);

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolvePromise(stdout);
      else rejectPromise(new Error(stderr.trim().replace(/^error:\s*/, "") || `Cactus exited with status ${code}.`));
    });
    // cactusctl can exit before reading its input; report that as a failure instead of crashing.
    child.stdin.on("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.stdin.end(input);
  });
}
