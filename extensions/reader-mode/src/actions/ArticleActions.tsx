import { ActionPanel, Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { SummaryStyle } from "../types/summary";
import { ArchiveSource } from "../utils/paywall-hopper";
import { getStyleLabel } from "../utils/summarizer";
import { markdownToHtml } from "../utils/html-export";

export const SUMMARY_STYLES: { style: SummaryStyle; icon: Icon }[] = [
  { style: "overview", icon: Icon.List },
  { style: "raycast-style", icon: Icon.RaycastLogoPos },
  { style: "arc-style", icon: Icon.Stars },
  { style: "opposite-sides", icon: Icon.Switch },
  { style: "five-ws", icon: Icon.QuestionMark },
  { style: "eli5", icon: Icon.SpeechBubble },
  { style: "translated", icon: Icon.Globe },
  { style: "entities", icon: Icon.Person },
];

interface ArticleActionsProps {
  articleUrl: string;
  articleTitle: string;
  markdown: string;
  articleMarkdown: string;
  currentSummary: string | null;
  summaryStyle: SummaryStyle | null;
  canAccessAI: boolean;
  isSummarizing?: boolean;
  onSummarize: (style: SummaryStyle) => void;
  onStopSummarizing?: () => void;
  onReimportFromBrowser?: () => void;
  archiveSource?: ArchiveSource;
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

async function saveFile(content: string, filename: string, extension: string): Promise<void> {
  const downloadsDir = join(homedir(), "Downloads");
  const fullFilename = `${sanitizeFilename(filename)}.${extension}`;
  const filepath = join(downloadsDir, fullFilename);

  try {
    await mkdir(downloadsDir, { recursive: true });
    await writeFile(filepath, content, "utf-8");
    await showToast({
      style: Toast.Style.Success,
      title: "File Saved",
      message: fullFilename,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Save Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function ArticleActions({
  articleUrl,
  articleTitle,
  markdown,
  articleMarkdown,
  currentSummary,
  summaryStyle,
  canAccessAI,
  isSummarizing,
  onSummarize,
  onStopSummarizing,
  onReimportFromBrowser,
  archiveSource,
}: ArticleActionsProps) {
  const hasSummary = !!currentSummary;

  return (
    <ActionPanel>
      {isSummarizing && onStopSummarizing && (
        <Action title="Stop Summarizing" icon={Icon.Stop} onAction={onStopSummarizing} />
      )}

      {canAccessAI && (
        <ActionPanel.Submenu
          title={currentSummary ? "Change Summary Style" : "Summarize…"}
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        >
          {SUMMARY_STYLES.map(({ style, icon }) => (
            <Action key={style} title={getStyleLabel(style)} icon={icon} onAction={() => onSummarize(style)} />
          ))}
        </ActionPanel.Submenu>
      )}

      {/* Copy… submenu */}
      <ActionPanel.Submenu title="Copy…" icon={Icon.Clipboard} shortcut={Keyboard.Shortcut.Common.Copy}>
        {hasSummary && (
          <>
            <Action.CopyToClipboard title="Summary as Markdown" content={currentSummary} icon={Icon.Document} />
            <Action.CopyToClipboard title="Summary as HTML" content={markdownToHtml(currentSummary)} icon={Icon.Code} />
          </>
        )}
        <Action.CopyToClipboard title="Article as Markdown" content={articleMarkdown} icon={Icon.Document} />
        <Action.CopyToClipboard title="Article as HTML" content={markdownToHtml(articleMarkdown)} icon={Icon.Code} />
        {hasSummary && summaryStyle && (
          <>
            <Action.CopyToClipboard title="All as Markdown" content={markdown} icon={Icon.Document} />
            <Action.CopyToClipboard title="All as HTML" content={markdownToHtml(markdown)} icon={Icon.Code} />
          </>
        )}
      </ActionPanel.Submenu>

      {/* Save… submenu */}
      <ActionPanel.Submenu title="Save…" icon={Icon.Download} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
        {hasSummary && (
          <>
            <Action
              title="Summary as Markdown"
              icon={Icon.Document}
              onAction={() => saveFile(currentSummary, `${articleTitle}-summary`, "md")}
            />
            <Action
              title="Summary as HTML"
              icon={Icon.Code}
              onAction={() => saveFile(markdownToHtml(currentSummary), `${articleTitle}-summary`, "html")}
            />
          </>
        )}
        <Action
          title="Article as Markdown"
          icon={Icon.Document}
          onAction={() => saveFile(articleMarkdown, articleTitle, "md")}
        />
        <Action
          title="Article as HTML"
          icon={Icon.Code}
          onAction={() => saveFile(markdownToHtml(articleMarkdown), articleTitle, "html")}
        />
        {hasSummary && summaryStyle && (
          <>
            <Action
              title="All as Markdown"
              icon={Icon.Document}
              onAction={() => saveFile(markdown, `${articleTitle}-with-summary`, "md")}
            />
            <Action
              title="All as HTML"
              icon={Icon.Code}
              onAction={() => saveFile(markdownToHtml(markdown), `${articleTitle}-with-summary`, "html")}
            />
          </>
        )}
      </ActionPanel.Submenu>

      <Action.OpenInBrowser title="Open in Browser" url={articleUrl} shortcut={Keyboard.Shortcut.Common.Open} />
      <Action.CopyToClipboard
        title="Copy URL"
        content={articleUrl}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {archiveSource?.url && (
        <Action.CopyToClipboard
          title="Copy Archived Copy URL"
          content={archiveSource.url}
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
      )}
      {onReimportFromBrowser && (
        <Action
          title="Import from Browser Tab"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={onReimportFromBrowser}
        />
      )}
    </ActionPanel>
  );
}
