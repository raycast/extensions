import {
  AI,
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeHtmlEntities,
  getAccessToken,
  getArticleDate,
  getArticleUrl,
  getSummaryLanguage,
  htmlToPlainText,
  isUnauthorized,
  normalizeErrorMessage,
  requestJson,
  type InoreaderArticle,
  type StreamContentsResponse,
} from "./my-feed";

const ALL_FOLLOWED_STREAM_ID = "user/-/state/com.google/reading-list";
const READ_TAG_ID = "user/-/state/com.google/read";
const DEFAULT_PAGE_SIZE = 50;
const MAX_ITEMS_FOR_PROMPT = 80;
const MAX_PREVIEW_WORDS = 150;
const MAX_FEED_CONTENT_CHARS = 40_000;

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
}

function buildFeedDigest(items: InoreaderArticle[]): { feedContent: string; analyzedCount: number } {
  const lines: string[] = [];
  let totalChars = 0;
  let analyzedCount = 0;

  for (const item of items.slice(0, MAX_ITEMS_FOR_PROMPT)) {
    const title = decodeHtmlEntities(item.title?.trim() || "Untitled article");
    const source = decodeHtmlEntities(item.origin?.title?.trim() || "");
    const url = getArticleUrl(item) || "";
    const date = getArticleDate(item)?.toISOString() || "";
    const preview = truncateWords(htmlToPlainText(item.summary?.content), MAX_PREVIEW_WORDS);

    const block = [
      `- Title: ${title}`,
      source ? `  Source: ${source}` : "",
      date ? `  Date: ${date}` : "",
      url ? `  URL: ${url}` : "",
      preview ? `  Preview: ${preview}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const next = `${block}\n`;
    if (totalChars + next.length > MAX_FEED_CONTENT_CHARS) {
      break;
    }

    lines.push(block);
    totalChars += next.length;
    analyzedCount += 1;
  }

  return {
    feedContent: lines.join("\n\n"),
    analyzedCount,
  };
}

function buildExecutiveSummaryPrompt(feedContent: string, language: string): string {
  return [
    'Act as a high-level "Chief of Staff" expert in information synthesis. I have limited time, and I need to know what truly matters in my RSS feed, regardless of the topic (Tech, Finance, Sports, Hobbies, etc.).',
    "",
    "Here are your strict instructions:",
    "",
    "0. OUTPUT LANGUAGE:",
    `   - The final executive brief MUST be entirely written in ${language}.`,
    "",
    "1. CONTEXT DETECTION:",
    "   - First, scan the headlines to determine the dominant themes of the provided feed.",
    "",
    "2. RUTHLESS FILTERING (The Noise):",
    '   - IGNORE purely promotional content ("Deals", "Sales", "Best Price").',
    '   - IGNORE Clickbait (Vague titles like "You won\'t believe...", "This mistake...").',
    "   - IGNORE Low-effort content (YouTube Shorts, 10-second clips, viral fluff).",
    "   - IGNORE Minor rumors (unless they indicate a massive industry shift).",
    "   - IGNORE Trivial events (Birthdays, anniversaries, minor updates).",
    "",
    "3. SELECTION (The Signal):",
    '   - KEEP "Game Changers": Major events, structural changes, new regulations, major product launches.',
    '   - KEEP "Deep Dives": In-depth analysis, complex tutorials, scientific breakthroughs.',
    '   - KEEP "Strategic Moves": M&A, big transfers (sports), policy shifts (politics).',
    "",
    "4. OUTPUT FORMAT (THE EXECUTIVE BRIEF):",
    "   - Group by the themes you detected.",
    "   - Use this specific structure for every point:",
    '     **[Clarified Title]**: The core fact. -> *The "So What?" (Why this matters / The strategic value).*',
    "   - Add a second line after each point with only a markdown link to the chosen source in this format: `[Source](URL)`.",
    "   - If multiple feed items cover the same subject, keep only one link and choose the most credible / widely recognized source.",
    "   - Never invent URLs. Only use URLs present in the provided feed content.",
    "",
    "---",
    "EXAMPLES OF EXPECTED OUTPUT (Adapts to topic):",
    "",
    'If the feed is "Cooking & Health":',
    "### 🥗 Nutrition Science",
    "* **New Sugar Study**: Confirmed link to specific inflammation markers over 10 years. -> *Challenges current keto diet trends; relevant for meal planning.*",
    "  [Nature](https://example.com)",
    "",
    'If the feed is "Tech & Business":',
    "### 🏢 Market Strategy",
    "* **Studio X acquired by Y**: $2B transaction finalized. -> *Consolidates the market; expect exclusive titles on Platform Z next year.*",
    "  [Financial Times](https://example.com)",
    "",
    "---",
    "END OF INSTRUCTIONS.",
    "Analyze the following RSS feed and produce the Executive Brief:",
    "",
    "[INSERT RSS FEED CONTENT HERE]",
    "```text",
    feedContent,
    "```",
  ].join("\n");
}

function addSpacingToExecutiveSummary(markdown: string): string {
  return markdown
    .replace(/\n(###\s)/g, "\n\n$1")
    .replace(/\n(\* \*\*)/g, "\n\n$1")
    .replace(/\n(\[[^\]]+\]\(https?:\/\/)/g, "\n\n$1");
}

function getExecutiveSummaryMarkdown(
  summary: string,
  analyzedCount: number,
  totalCount: number,
  language: string,
): string {
  const formattedSummary = addSpacingToExecutiveSummary(summary.trim());
  return [
    "# Executive Summary",
    "",
    `Analyzed ${analyzedCount} unread article(s) out of ${totalCount} fetched.`,
    "",
    `Output language: ${language}`,
    "",
    formattedSummary,
  ].join("\n");
}

export default function Command() {
  const rawPreferences = getPreferenceValues<Preferences.MyFeed>();
  const preferences: Preferences.MyFeed = {
    clientId: rawPreferences.clientId,
    clientSecret: rawPreferences.clientSecret,
    scope: rawPreferences.scope,
    unreadOnly: rawPreferences.unreadOnly,
    itemsPerPage: rawPreferences.itemsPerPage,
    showSiteName: rawPreferences.showSiteName,
    aiSummaryLanguage: rawPreferences.aiSummaryLanguage,
  };
  const summaryLanguage = getSummaryLanguage(preferences.aiSummaryLanguage);
  const preferenceDeps = [
    preferences.clientId,
    preferences.clientSecret,
    preferences.scope,
    preferences.itemsPerPage,
    preferences.aiSummaryLanguage,
  ] as const;
  const [isLoading, setIsLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string>("Preparing executive summary...");
  const hasAutoRunRef = useRef(false);
  const requestIdRef = useRef(0);

  const runExecutiveSummary = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    if (!environment.canAccess(AI)) {
      if (!isStale()) {
        setMarkdown(
          "# Executive Summary\n\nYou don't have access to Raycast AI. Enable Raycast Pro to use this command.",
        );
      }
      return;
    }

    setIsLoading(true);
    setMarkdown("Loading unread articles and generating executive summary...");

    try {
      const token = await getAccessToken(preferences, true);
      if (isStale()) {
        return;
      }
      if (!token) {
        setMarkdown("# Executive Summary\n\nUnable to connect to Inoreader.");
        return;
      }

      const pageSize = Math.max(
        1,
        Math.min(
          MAX_ITEMS_FOR_PROMPT,
          Number.parseInt(preferences.itemsPerPage || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
        ),
      );

      const params = new URLSearchParams();
      params.set("n", String(pageSize));
      params.set("xt", READ_TAG_ID);

      const encodedStreamId = encodeURIComponent(ALL_FOLLOWED_STREAM_ID);
      const response = await requestJson<StreamContentsResponse>(token, `/stream/contents/${encodedStreamId}`, params);
      if (isStale()) {
        return;
      }
      const items = response.items ?? [];

      if (items.length === 0) {
        setMarkdown("# Executive Summary\n\nNo unread articles found.");
        return;
      }

      const { feedContent, analyzedCount } = buildFeedDigest(items);
      if (!feedContent.trim() || analyzedCount === 0) {
        setMarkdown(
          "# Executive Summary\n\nUnread articles were found, but there was not enough readable RSS content to summarize.",
        );
        return;
      }

      const prompt = buildExecutiveSummaryPrompt(feedContent, summaryLanguage);
      const summary = await AI.ask(prompt, { creativity: "low" });
      if (isStale()) {
        return;
      }
      setMarkdown(getExecutiveSummaryMarkdown(summary, analyzedCount, items.length, summaryLanguage));
    } catch (error) {
      if (isStale()) {
        return;
      }
      if (isUnauthorized(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication expired",
          message: "Reconnect to Inoreader and try again.",
        });
      }

      setMarkdown(
        [
          "# Executive Summary",
          "",
          "Unable to generate executive summary.",
          "",
          `Error: ${normalizeErrorMessage(error)}`,
        ].join("\n"),
      );
    } finally {
      if (!isStale()) {
        setIsLoading(false);
      }
    }
  }, [...preferenceDeps, summaryLanguage]);

  useEffect(() => {
    if (hasAutoRunRef.current) {
      return;
    }
    hasAutoRunRef.current = true;
    void runExecutiveSummary();
  }, [runExecutiveSummary]);

  return (
    <Detail
      navigationTitle="Executive Summary"
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Regenerate Summary" icon={Icon.ArrowClockwise} onAction={() => void runExecutiveSummary()} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
