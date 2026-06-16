import { Clipboard, getPreferenceValues, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stat } from "node:fs/promises";
import nodePath from "node:path";
import { expandTildePath } from "./shell";

type NewThreadInput = {
  prompt?: string;
  path?: string;
};

const CODEX_APP_URL = "codex://";
const CODEX_NEW_THREAD_URL = "codex://threads/new";

export async function openCodexApp(): Promise<void> {
  await open(CODEX_APP_URL);
}

export async function openNewCodexThread(
  input: NewThreadInput = {},
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const projectPath = await resolveProjectDirectory(
    input.path ?? preferences.defaultProjectDirectory,
  );
  const prompt = input.prompt?.trim();

  if (!projectPath && !prompt) {
    await open(CODEX_NEW_THREAD_URL);
    await showHUD("Started a new Codex thread.");
    return;
  }

  await open(buildNewThreadUrl({ path: projectPath, prompt }));
  await showHUD(
    prompt ? "Started Codex thread with prompt." : "Started Codex thread.",
  );
}

export async function openNewCodexThreadFromClipboard(): Promise<void> {
  try {
    const prompt = (await Clipboard.readText())?.trim();
    if (!prompt) {
      await showHUD("Clipboard does not contain text.");
      return;
    }

    await openNewCodexThread({ prompt });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
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

function buildNewThreadUrl({ path, prompt }: NewThreadInput): string {
  const params = new URLSearchParams();

  if (prompt?.trim()) {
    params.set("prompt", prompt.trim());
  }

  if (path?.trim()) {
    params.set("path", path.trim());
  }

  const query = params.toString();
  return query ? `${CODEX_NEW_THREAD_URL}?${query}` : CODEX_NEW_THREAD_URL;
}
