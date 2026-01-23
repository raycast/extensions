import { Detail } from "@raycast/api";
import { ArticleState } from "../types/article";
import { SummaryStyle } from "../types/summary";
import { formatSummaryBlock } from "../utils/summarizer";
import { ArticleActions } from "../actions/ArticleActions";

interface ArticleDetailViewProps {
  article: ArticleState;
  summaryStyle: SummaryStyle | null;
  currentSummary: string | null;
  isSummarizing: boolean;
  canAccessAI: boolean;
  onSummarize: (style: SummaryStyle) => void;
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
): string {
  const header = buildArticleHeader(article);
  const parts: string[] = [header, "", "---"];

  if (summaryStyle) {
    if (isSummarizing && currentSummary) {
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle), "", "*Generating summary...*");
    } else if (isSummarizing) {
      parts.push("", "> Generating summary...");
    } else if (currentSummary) {
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle));
    }
    parts.push("", "---");
  }

  parts.push("", article.bodyMarkdown);
  return parts.join("\n");
}

export function ArticleDetailView({
  article,
  summaryStyle,
  currentSummary,
  isSummarizing,
  canAccessAI,
  onSummarize,
  onStopSummarizing,
  onReimportFromBrowser,
}: ArticleDetailViewProps) {
  const markdown = buildMarkdown(article, summaryStyle, currentSummary, isSummarizing);

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
          onStopSummarizing={onStopSummarizing}
          onReimportFromBrowser={onReimportFromBrowser}
          archiveSource={article.archiveSource}
        />
      }
    />
  );
}
