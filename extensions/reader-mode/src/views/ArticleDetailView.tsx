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
  shouldShowSummary: boolean;
  canAccessAI: boolean;
  onSummarize: (style: SummaryStyle) => void;
  onReimportFromBrowser?: () => void;
}

function buildMarkdown(
  article: ArticleState,
  summaryStyle: SummaryStyle | null,
  currentSummary: string | null,
  isSummarizing: boolean,
  shouldShowSummary: boolean,
): string {
  const parts: string[] = [];

  // 1. Title
  parts.push(`# ${article.title}`);

  // 2. Metadata (byline • siteName)
  const metaParts: string[] = [];
  if (article.byline) metaParts.push(article.byline);
  if (article.siteName) metaParts.push(article.siteName);
  if (metaParts.length > 0) {
    parts.push("", `*${metaParts.join(" • ")}*`);
  }

  // 3. Summary section (if applicable)
  if (shouldShowSummary && summaryStyle) {
    parts.push("", "---");

    if (isSummarizing && currentSummary) {
      // Streaming in progress - show partial summary
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle), "", "*Generating summary...*");
    } else if (isSummarizing) {
      // Just started, no data yet
      parts.push("", "> Generating summary...");
    } else if (currentSummary) {
      // Complete summary
      parts.push("", formatSummaryBlock(currentSummary, summaryStyle));
    }

    parts.push("", "---");
  } else {
    // No summary - just add separator before body
    parts.push("", "---");
  }

  // 4. Body content
  parts.push("", article.bodyMarkdown);

  return parts.join("\n");
}

export function ArticleDetailView({
  article,
  summaryStyle,
  currentSummary,
  isSummarizing,
  shouldShowSummary,
  canAccessAI,
  onSummarize,
  onReimportFromBrowser,
}: ArticleDetailViewProps) {
  const markdown = buildMarkdown(article, summaryStyle, currentSummary, isSummarizing, shouldShowSummary);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={article.title}
      isLoading={isSummarizing}
      actions={
        <ArticleActions
          articleUrl={article.url}
          markdown={markdown}
          currentSummary={currentSummary}
          canAccessAI={canAccessAI}
          onSummarize={onSummarize}
          onReimportFromBrowser={onReimportFromBrowser}
          archiveSource={article.archiveSource}
        />
      }
    />
  );
}
