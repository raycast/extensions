import {
  Application,
  BrowserExtension,
  Clipboard,
  environment,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
} from "@raycast/api";
import { basename } from "path";
import { ActionType } from "./types";
import { getUrlLabel, inferActionFromText } from "./capture-utils";

export interface CaptureCandidate {
  type: Exclude<ActionType, "command">;
  label: string;
  value: string;
  source: string;
  browser?: string;
}

export async function getCaptureCandidate(): Promise<CaptureCandidate | null> {
  const browserTab = await getBrowserTabCandidate();
  if (browserTab) {
    return browserTab;
  }

  const finderItem = await getFinderItemCandidate();
  if (finderItem) {
    return finderItem;
  }

  const selectedText = await getTextCandidate("Selected Text", () =>
    getSelectedText(),
  );
  if (selectedText) {
    return selectedText;
  }

  const clipboardText = await getTextCandidate("Clipboard", () =>
    Clipboard.readText(),
  );
  if (clipboardText) {
    return clipboardText;
  }

  return getFrontmostApplicationCandidate();
}

async function getBrowserTabCandidate(): Promise<CaptureCandidate | null> {
  if (
    process.platform === "win32" ||
    !environment.canAccess(BrowserExtension)
  ) {
    return null;
  }

  try {
    const tabs = await BrowserExtension.getTabs();
    const tab =
      tabs.find((candidate) => candidate.active && candidate.url) ||
      tabs.find((candidate) => candidate.url);
    if (!tab?.url) {
      return null;
    }

    return {
      type: "url",
      label: tab.title || getUrlLabel(tab.url),
      value: tab.url,
      source: "Active Browser Tab",
    };
  } catch {
    return null;
  }
}

async function getFinderItemCandidate(): Promise<CaptureCandidate | null> {
  try {
    const [item] = await getSelectedFinderItems();
    if (!item?.path) {
      return null;
    }

    return {
      type: "folder",
      label: basename(item.path) || item.path,
      value: item.path,
      source: "Selected Finder Item",
    };
  } catch {
    return null;
  }
}

async function getTextCandidate(
  source: string,
  readText: () => Promise<string | undefined>,
): Promise<CaptureCandidate | null> {
  try {
    const inferred = inferActionFromText(await readText());
    if (!inferred) {
      return null;
    }

    return {
      ...inferred,
      source,
    };
  } catch {
    return null;
  }
}

async function getFrontmostApplicationCandidate(): Promise<CaptureCandidate | null> {
  try {
    const app: Application = await getFrontmostApplication();
    if (!app.path) {
      return null;
    }

    return {
      type: "application",
      label: app.name,
      value: app.path,
      source: "Frontmost Application",
    };
  } catch {
    return null;
  }
}
