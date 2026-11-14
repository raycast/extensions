import { memo } from "react";
import { Detail } from "@raycast/api";
import { ArticleActions } from "../actions/ArticleActions";
import { DEFAULT_SUMMARY_MODEL, getSummaryModelTitle, SummaryModelKey } from "../config/ai";
import { ArticleState } from "../types/article";
import { SummaryStyle } from "../types/summary";
import { formatSummaryBlock } from "../utils/summarizer";

interface ArticleDetailViewProps {
  article: ArticleState;
  summaryStyle: SummaryStyle | null;
  currentSummary: string | null;
  isSummarizing: boolean;
  canAccessAI: boolean;
  onSummarize: (style: SummaryStyle) => void;
  summaryModel: SummaryModelKey;
  onRegenerate: (model: SummaryModelKey) => void;
  onStopSummarizing?: () => void;
  onReimportFromBrowser?: () => void;
}

/**
 * Builds the article header (title + metadata) as Markdown.
 * Reusable for both display and export.
 */
export function buildArticleHeader(article: ArticleState): string {
  const parts: string[] = [];

  // 1. Title
  parts.push(`# ${article.title}`);

  // 2. Metadata (byline • siteName • archive source)
  const metaParts: string[] = [];
  if (article.byline) metaParts.push(article.byline);
  if (article.siteName) metaParts.push(article.siteName);
  if (article.archiveSource) {
    const sourceLabels: Record<string, string> = {
      googlebot: "Googlebot",
      bingbot: "Bingbot",
      "social-referrer": "Social Referrer",
      wallhopper: "WallHopper",
      "archive.is": "Archive.is",
      wayback: "Wayback Machine",
      browser: "Browser",
    };
    const label = sourceLabels[article.archiveSource.service] || article.archiveSource.service;
    // Link to archive URL if available (Archive.is, Wayback Machine)
    if (article.archiveSource.url) {
      metaParts.push(`Retrieved via [${label}](${article.archiveSource.url})`);
    } else {
      metaParts.push(`Retrieved via ${label}`);
    }
  }
  if (metaParts.length > 0) {
    parts.push("", `*${metaParts.join(" • ")}*`);
  }

  return parts.join("\n");
}

/**
 * Builds article-only Markdown (header + body, no summary).
 * Used for "Copy/Save Article" actions.
 */
export function buildArticleMarkdown(article: ArticleState): string {
  const header = buildArticleHeader(article);
  return [header, "", "---", "", article.bodyMarkdown].join("\n");
}

/**
 * Builds the full display Markdown (header + optional summary + body).
 */
function buildMarkdown(
  article: ArticleState,
  summaryStyle: SummaryStyle | null,
  currentSummary: string | null,
  isSummarizing: boolean,
  summaryModel: SummaryModelKey,
): string {
  const header = buildArticleHeader(article);
  // Name the model only when it isn't the default.
  const modelTitle = summaryModel === DEFAULT_SUMMARY_MODEL ? null : getSummaryModelTitle(summaryModel);
  const parts: string[] = [header, "", "---"];

  if (summaryStyle) {
    if (isSummarizing && currentSummary) {
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle, modelTitle), "", "*Generating summary...*");
    } else if (isSummarizing) {
      parts.push("", "> Generating summary...");
    } else if (currentSummary) {
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle, modelTitle));
    }
    parts.push("", "---");
  }

  parts.push("", article.bodyMarkdown);
  return parts.join("\n");
}

// Memoized: the reader re-renders on every streamed summary token, and every update of this view
// re-sends the whole article to Raycast. Its props only change when the throttled summary does.
export const ArticleDetailView = memo(function ArticleDetailView({
  article,
  summaryStyle,
  currentSummary,
  isSummarizing,
  canAccessAI,
  onSummarize,
  summaryModel,
  onRegenerate,
  onStopSummarizing,
  onReimportFromBrowser,
}: ArticleDetailViewProps) {
  const markdown = buildMarkdown(article, summaryStyle, currentSummary, isSummarizing, summaryModel);

  return (
    <Detail
      markdown={markdown}
      isLoading={isSummarizing}
      actions={
        <ArticleActions
          articleUrl={article.url}
          articleTitle={article.title}
          markdown={markdown}
          currentSummary={currentSummary}
          canAccessAI={canAccessAI}
          isSummarizing={isSummarizing}
          onSummarize={onSummarize}
          summaryModel={summaryModel}
          onRegenerate={onRegenerate}
          onStopSummarizing={onStopSummarizing}
          onReimportFromBrowser={onReimportFromBrowser}
          archiveSource={article.archiveSource}
        />
      }
    />
  );
});
