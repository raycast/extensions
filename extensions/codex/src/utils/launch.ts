import { Clipboard, getPreferenceValues, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import nodePath from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { expandTildePath } from "./shell";

const execFileAsync = promisify(execFile);

type NewThreadInput = {
  prompt?: string;
  path?: string;
  mode?: "chat" | "codex";
};

const codexAppUrl = "codex://";
const newCodexThreadUrl = "codex://threads/new";
// codex:// is handled by the unified ChatGPT app (bundled Codex) or the
// legacy ChatGPT Classic app.
const codexAppBundleIds = ["com.openai.codex", "com.openai.chat"];
const codexAppLaunchTimeoutMs = 15000;
const codexAppLaunchPollIntervalMs = 250;
const codexAppSettleDelayMs = 2000;

export async function openCodexApp(): Promise<void> {
  await open(codexAppUrl);
}

export async function openNewCodexThread(
  input: NewThreadInput = {},
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const mode =
    input.mode ?? (preferences.newChatMode === "codex" ? "codex" : "chat");
  const defaultWorkingDirectory = preferences.defaultProjectDirectory;
  const projectPath =
    mode === "codex"
      ? await resolveProjectDirectory(input.path ?? defaultWorkingDirectory)
      : undefined;
  const prompt = input.prompt?.trim();

  await ensureCodexAppIsReady();
  await open(buildNewThreadUrl({ path: projectPath, prompt, mode }));
  await showHUD(
    prompt
      ? "Opened new chat with prompt — press Send to chat"
      : "Opened new chat",
  );
}

export async function openNewCodexThreadFromClipboard(): Promise<void> {
  try {
    const prompt = (await Clipboard.readText())?.trim();
    if (!prompt) {
      await showHUD("Clipboard does not contain text");
      return;
    }

    await openNewCodexThread({ prompt });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
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
  const results = await Promise.all(
    codexAppBundleIds.map((bundleId) =>
      execFileAsync("lsappinfo", ["find", `bundleid=${bundleId}`]),
    ),
  );
  return results.some(({ stdout }) => stdout.trim().length > 0);
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

function buildNewThreadUrl({
  path,
  prompt,
  mode = "chat",
}: NewThreadInput): string {
  const params = new URLSearchParams({ mode });

  if (prompt) {
    params.set("prompt", prompt);
  }

  if (path && mode === "codex") {
    params.set("path", path);
  }

  const query = params.toString();
  return query ? `${newCodexThreadUrl}?${query}` : newCodexThreadUrl;
}
