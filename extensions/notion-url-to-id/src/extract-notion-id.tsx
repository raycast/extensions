import {
  Clipboard,
  Toast,
  getFrontmostApplication,
  showToast,
} from "@raycast/api";

import { getFrontmostBrowserTab, isSupportedBrowser } from "./lib/browser";
import { recordHistoryEntry } from "./lib/history";
import {
  extractNotionId,
  isNotionUrl,
  resolveNotionPageName,
} from "./lib/notion";

const FAILURE_TITLE = "No valid Notion ID found - check the URL and try again";

interface NotionExtractionCandidate {
  rawValue: string;
  pageName?: string;
  sourceUrl?: string;
}

async function getCandidateFromFocusedBrowser(): Promise<NotionExtractionCandidate | null> {
  try {
    const frontmostApplication = await getFrontmostApplication();

    if (!isSupportedBrowser(frontmostApplication)) {
      return null;
    }

    const tab = await getFrontmostBrowserTab(frontmostApplication);
    if (!isNotionUrl(tab.url)) {
      return null;
    }

    return {
      rawValue: tab.url,
      pageName: tab.title,
      sourceUrl: tab.url,
    };
  } catch {
    return null;
  }
}

async function getCandidateFromClipboard(): Promise<NotionExtractionCandidate | null> {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText?.trim()) {
      return null;
    }

    return {
      rawValue: clipboardText,
      sourceUrl: isNotionUrl(clipboardText) ? clipboardText : undefined,
    };
  } catch {
    return null;
  }
}

export default async function Command() {
  const candidate =
    (await getCandidateFromFocusedBrowser()) ??
    (await getCandidateFromClipboard());
  const notionId = candidate ? extractNotionId(candidate.rawValue) : null;

  if (!notionId) {
    await showToast({
      style: Toast.Style.Failure,
      title: FAILURE_TITLE,
    });
    return;
  }

  await Clipboard.copy(notionId);
  await recordHistoryEntry({
    notionId,
    pageName: resolveNotionPageName({
      notionId,
      sourceUrl: candidate?.sourceUrl,
      title: candidate?.pageName,
    }),
    sourceUrl: candidate?.sourceUrl,
  });
  await showToast({
    style: Toast.Style.Success,
    title: `Successfully copied ${notionId}`,
  });
}
