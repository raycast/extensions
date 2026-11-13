import { getPreferenceValues, open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import nodePath from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { expandTildePath } from "./shell";

const execFileAsync = promisify(execFile);

type CodexNewThreadMode = Preferences["newThreadMode"];

type NewThreadInput = {
  prompt?: string;
  path?: string;
  mode?: CodexNewThreadMode;
};

const newThreadModes: readonly CodexNewThreadMode[] = ["codex", "work", "chat"];

const codexAppUrl = "codex://";
const newCodexThreadUrl = "codex://threads/new";
// codex:// is handled by the unified ChatGPT app (bundled Codex) or the
// legacy ChatGPT Classic app.
const codexAppBundleIds = ["com.openai.codex", "com.openai.chat"];
const codexAppLaunchTimeoutMs = 15000;
const codexAppLaunchPollIntervalMs = 250;
const codexAppSettleDelayMs = 2000;

export function buildCodexThreadUrl(threadId: string): string {
  return `codex://threads/${threadId}`;
}

export async function openCodexThread(threadId: string): Promise<void> {
  await open(buildCodexThreadUrl(threadId));
}

export async function openCodexApp(): Promise<void> {
  await open(codexAppUrl);
  await activateCodexApp();
}

export async function openCodexProject(projectId: string): Promise<void> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("Project ID is required.");
  }

  const params = new URLSearchParams({ projectId: id });
  await ensureCodexAppIsReady();
  // The new alias handles projectId alone and leaves the app's mode unchanged.
  await open(`codex://new?${params.toString()}`);
  await activateCodexApp();
}

// Opening codex:// does not reliably bring an already-running app to the front,
// so nudge whichever handler is installed.
async function activateCodexApp(): Promise<void> {
  for (const bundleId of codexAppBundleIds) {
    try {
      await execFileAsync("/usr/bin/open", ["-b", bundleId]);
      return;
    } catch {
      // Not installed. Try the next handler.
    }
  }
}

export async function openNewCodexThread(
  input: NewThreadInput = {},
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const mode = resolveNewThreadMode(input.mode ?? preferences.newThreadMode);
  // Chat has no working directory, so a missing folder must not block it.
  const projectPath =
    mode === "chat"
      ? undefined
      : await resolveProjectDirectory(
          input.path ?? preferences.defaultProjectDirectory,
        );
  const prompt = input.prompt?.trim();

  await ensureCodexAppIsReady();
  await open(buildNewThreadUrl({ path: projectPath, prompt, mode }));
  await showHUD(
    prompt ? "Initialized new thread with prompt" : "Initialized new thread",
  );
}

// A deep link sent while the app is cold-starting gets dropped, opening an
// empty composer. Launch the app first and give it a moment to settle.
async function ensureCodexAppIsReady(): Promise<void> {
  if (await isCodexAppRunning()) {
    return;
  }

  await open(codexAppUrl);

  const deadline = Date.now() + codexAppLaunchTimeoutMs;
  while (!(await isCodexAppRunning())) {
    if (Date.now() > deadline) {
      throw new Error("Codex failed to open in time");
    }

    await delay(codexAppLaunchPollIntervalMs);
  }

  await delay(codexAppSettleDelayMs);
}

async function isCodexAppRunning(): Promise<boolean> {
  // Checked in order and stopped at the first hit, so the common case spawns
  // one probe per poll rather than one per handler. A probe that cannot run
  // says nothing about the other handler, so it must not fail the whole check.
  for (const bundleId of codexAppBundleIds) {
    try {
      const { stdout } = await execFileAsync("lsappinfo", [
        "find",
        `bundleid=${bundleId}`,
      ]);
      if (stdout.trim().length > 0) {
        return true;
      }
    } catch {
      // Try the next handler.
    }
  }

  return false;
}

async function resolveProjectDirectory(
  rawPath: string | undefined,
): Promise<string | undefined> {
  const trimmedPath = rawPath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const expandedPath = expandTildePath(trimmedPath);
  if (!nodePath.isAbsolute(expandedPath)) {
    throw new Error("Project path must be an absolute local directory.");
  }

  const stats = await stat(expandedPath).catch(() => undefined);
  if (!stats?.isDirectory()) {
    throw new Error(
      `Project path does not exist or is not a directory: ${expandedPath}`,
    );
  }

  return expandedPath;
}

// The app rejects the whole link on an unknown mode, so an unexpected stored
// value falls back to Codex instead of opening nothing.
function resolveNewThreadMode(value: string | undefined): CodexNewThreadMode {
  return newThreadModes.find((mode) => mode === value) ?? "codex";
}

function buildNewThreadUrl({
  path,
  prompt,
  mode = "codex",
}: NewThreadInput): string {
  const params = new URLSearchParams();

  if (prompt) {
    params.set("prompt", prompt);
  }

  if (path) {
    params.set("path", path);
  }

  // Always send mode. Without it the app stays in whatever mode it last used.
  params.set("mode", mode);

  return `${newCodexThreadUrl}?${params.toString()}`;
}
