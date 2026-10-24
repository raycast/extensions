import { getPreferenceValues, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { findBolt, isExecutable } from "./bolt-path";

// Every command goes through the `bolt` tool embedded in BoltAI.app. The tool talks to the running
// app (and opens it in the background when needed); this extension never reads API keys or data.

export type Workflow = {
  id: string;
  name: string;
  kind: "workflow" | "multi-step";
  summary?: string;
  enabled?: boolean;
};
export type Prompt = { id: string; name: string; description: string | null };

/** Exit codes shared by every bolt command (SharedIPC/BoltCLIProtocol.swift). */
const exitMessages: Record<number, string> = {
  2: "BoltAI didn't understand the request",
  3: "Not found in BoltAI",
  4: "The AI request failed",
  5: "BoltAI needs attention",
  6: "BoltAI isn't responding",
  130: "Cancelled",
};

/** Not an exit code: the tool itself couldn't be found. */
export const boltMissing = -1;
export const boltAIDownloadURL = "https://boltai.com";

export class BoltError extends Error {
  constructor(
    readonly title: string,
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
}

export async function showBoltFailure(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return;
  const code = error instanceof BoltError ? error.code : undefined;
  if (code === 130) return;
  await showToast({
    style: Toast.Style.Failure,
    title: error instanceof BoltError ? error.title : "BoltAI failed",
    message: error instanceof Error ? error.message : String(error),
    primaryAction:
      code === boltMissing
        ? { title: "Get BoltAI", onAction: () => open(boltAIDownloadURL) }
        : code === 5 || code === 6
          ? { title: "Open BoltAI", onAction: () => openBoltAI() }
          : undefined,
    secondaryAction:
      code === boltMissing
        ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
        : undefined,
  });
}

export function boltPath(): string {
  const { boltPath } = getPreferenceValues<Preferences>();
  const custom = boltPath?.trim().replace(/^~(?=$|\/)/, homedir());
  if (custom) {
    if (isExecutable(custom)) return custom;
    throw new BoltError(
      "bolt not found",
      `Nothing runnable at ${custom}. Fix the path in the extension's preferences.`,
      boltMissing,
    );
  }
  const found = findBolt(homedir());
  if (!found) {
    throw new BoltError(
      "bolt not found",
      "Needs BoltAI 3.0 or later, which includes the bolt tool: get it at boltai.com. If BoltAI is somewhere else, set Bolt Path in the extension's preferences.",
      boltMissing,
    );
  }
  return found;
}

/**
 * Opens BoltAI.app directly, not through `bolt`: this is offered exactly when `bolt` can't reach
 * the app. The tool lives at BoltAI.app/Contents/Helpers/bolt (~/.local/bin/bolt links there).
 */
export async function openBoltAI() {
  try {
    const app = dirname(dirname(dirname(realpathSync(boltPath()))));
    if (!app.endsWith(".app")) throw new Error(`bolt isn't inside BoltAI.app (${app}).`);
    await open(app);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open BoltAI",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Runs `bolt <args>` and returns stdout. `input` is piped to stdin; stdin is always closed. */
/** `bolt` writes these on stderr when BOLT_PROGRESS=1, e.g. "progress: Step 2 of 3 · Polish". */
const progressPrefix = "progress: ";

export function bolt(
  args: string[],
  options: { input?: string; signal?: AbortSignal; onProgress?: (text: string) => void } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    let executable: string;
    try {
      executable = boltPath();
    } catch (error) {
      reject(error);
      return;
    }
    // Closing the connection cancels the request in BoltAI, so killing the tool is enough.
    const env = options.onProgress ? { ...process.env, BOLT_PROGRESS: "1" } : process.env;
    const child = spawn(executable, args, { signal: options.signal, killSignal: "SIGINT", env });
    let stdout = "";
    let stderr = "";
    let partial = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      // Progress lines are reported as they arrive; everything else is the error message.
      const lines = (partial + chunk).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) {
        if (options.onProgress && line.startsWith(progressPrefix))
          options.onProgress(line.slice(progressPrefix.length));
        else stderr += line + "\n";
      }
    });
    child.on("error", (error) => {
      if (error.name === "AbortError") reject(error);
      else reject(new BoltError("Couldn't run bolt", error.message));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.replace(/\n$/, ""));
        return;
      }
      if (options.signal?.aborted) return;
      stderr += partial;
      const message = stderr.trim().replace(/^bolt: /, "") || `bolt exited with code ${code}.`;
      reject(new BoltError(exitMessages[code ?? -1] ?? "BoltAI failed", message, code ?? undefined));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input ?? "");
  });
}

export async function boltJSON<T>(args: string[], signal?: AbortSignal): Promise<T> {
  return JSON.parse(await bolt([...args, "--json"], { signal })) as T;
}
