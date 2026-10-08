import { Clipboard, Toast, getFrontmostApplication, showToast } from "@raycast/api";

import { getFrontmostBrowserTab, isSupportedBrowser } from "./lib/browser";
import { recordHistoryEntry } from "./lib/history";
import { getNotionDesktopWindowTitle, isNotionDesktopApp } from "./lib/notion-desktop";
import { extractNotionId, isNotionUrl, normalizeNotionPageTitle, resolveNotionPageName } from "./lib/notion";

const FAILURE_TITLE = "No valid Notion ID found - check the URL and try again";

interface NotionExtractionCandidate {
  rawValue: string;
  pageName?: string;
  sourceUrl?: string;
}

async function getCandidateFromFocusedBrowser(
  frontmostApplication: Awaited<ReturnType<typeof getFrontmostApplication>>,
): Promise<NotionExtractionCandidate | null> {
  try {
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

async function getCandidateFromClipboard(
  frontmostApplication?: Awaited<ReturnType<typeof getFrontmostApplication>>,
): Promise<NotionExtractionCandidate | null> {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText?.trim()) {
      return null;
    }

    let pageName: string | undefined;
    if (frontmostApplication && isNotionUrl(clipboardText) && isNotionDesktopApp(frontmostApplication)) {
      try {
        pageName = await getNotionDesktopWindowTitle(frontmostApplication);
      } catch {
        pageName = undefined;
      }
    }

    return {
      rawValue: clipboardText,
      pageName,
      sourceUrl: isNotionUrl(clipboardText) ? clipboardText : undefined,
    };
  } catch {
    return null;
  }
}

export default async function Command() {
  const frontmostApplication = await getFrontmostApplication().catch(() => null);

  const candidate =
    (frontmostApplication ? await getCandidateFromFocusedBrowser(frontmostApplication) : null) ??
    (await getCandidateFromClipboard(frontmostApplication ?? undefined));
  const notionId = candidate ? extractNotionId(candidate.rawValue) : null;

  if (!notionId) {
    await showToast({
      style: Toast.Style.Failure,
      title: FAILURE_TITLE,
    });
    return;
  }

  const tabTitleName = candidate?.pageName ? normalizeNotionPageTitle(candidate.pageName) : null;
  const pageName =
    tabTitleName ||
    resolveNotionPageName({
      notionId,
      sourceUrl: tabTitleName ? undefined : candidate?.sourceUrl,
      title: undefined,
    });

  await Clipboard.copy(notionId);
  await recordHistoryEntry({
    notionId,
    pageName,
    sourceUrl: candidate?.sourceUrl,
  });
  await showToast({
    style: Toast.Style.Success,
    title: `Successfully copied ${notionId}`,
  });
}
