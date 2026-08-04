import { LocalStorage } from "@raycast/api";

const LAST_SNIPPET_KEY = "lastSnippet";
const LAST_CAPTURE_TARGET_KEY = "lastCaptureTarget";

export interface LastSnippet {
  id: string;
  title: string;
  content: string;
}

export interface CaptureTarget {
  workspaceId?: string;
  folderId?: string;
}

export async function setLastSnippet(snippet: LastSnippet): Promise<void> {
  await LocalStorage.setItem(LAST_SNIPPET_KEY, JSON.stringify(snippet));
}

export async function getLastSnippet(): Promise<LastSnippet | null> {
  const raw = await LocalStorage.getItem<string>(LAST_SNIPPET_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastSnippet;
  } catch {
    return null;
  }
}

export async function setCaptureTarget(target: CaptureTarget): Promise<void> {
  await LocalStorage.setItem(LAST_CAPTURE_TARGET_KEY, JSON.stringify(target));
}

export async function getCaptureTarget(): Promise<CaptureTarget> {
  const raw = await LocalStorage.getItem<string>(LAST_CAPTURE_TARGET_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CaptureTarget;
  } catch {
    return {};
  }
}
