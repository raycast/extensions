import {
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  showToast,
  Toast,
  getPreferenceValues,
  showInFinder,
  Clipboard,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { SummaryStyle } from "../types/summary";
import { ArchiveSource } from "../utils/paywall-hopper";
import { getStyleLabel } from "../utils/summarizer";
import { markdownToHtml } from "../utils/html-export";

export const SUMMARY_STYLES: { style: SummaryStyle; icon: Icon }[] = [
  { style: "overview", icon: Icon.List },
  { style: "at-a-glance", icon: Icon.Stars },
  { style: "comprehensive", icon: Icon.RaycastLogoPos },
  { style: "opposite-sides", icon: Icon.Switch },
  { style: "five-ws", icon: Icon.QuestionMark },
  { style: "eli5", icon: Icon.SpeechBubble },
  { style: "entities", icon: Icon.Person },
];

interface ArticleActionsProps {
  articleUrl: string;
  articleTitle: string;
  markdown: string;
  currentSummary: string | null;
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
  const { downloadPath } = getPreferenceValues<ExtensionPreferences>();
  const saveDir = downloadPath || join(homedir(), "Downloads");
  const fullFilename = `${sanitizeFilename(filename)}.${extension}`;
  const filepath = join(saveDir, fullFilename);

  try {
    await mkdir(saveDir, { recursive: true });
    await writeFile(filepath, content, "utf-8");
    await showToast({
      style: Toast.Style.Success,
      title: "File Saved",
      message: fullFilename,
      primaryAction: {
        title: "Reveal in Finder",
        onAction: async () => {
          await showInFinder(filepath);
        },
      },
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
  currentSummary,
  canAccessAI,
  isSummarizing,
  onSummarize,
  onStopSummarizing,
  onReimportFromBrowser,
  archiveSource,
}: ArticleActionsProps) {
  return (
    <ActionPanel>
      {/* AI Summary Section */}
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

      {/* Copy & Save Section */}
      <ActionPanel.Section title="Copy & Save">
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={markdown}
          icon={Icon.Document}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action
          title="Copy as HTML"
          icon={Icon.Code}
          onAction={async () => {
            const html = markdownToHtml(markdown);
            await Clipboard.copy({ text: html, html });
            await closeMainWindow();
            await showHUD("Copied HTML to Clipboard");
          }}
        />
        <Action.CopyToClipboard
          title="Copy URL"
          content={articleUrl}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        {archiveSource?.url && (
          <Action.CopyToClipboard
            title="Copy Archived URL"
            content={archiveSource.url}
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        )}
        <Action
          title="Save as Markdown"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => saveFile(markdown, articleTitle, "md")}
        />
        <Action
          title="Save as HTML"
          icon={Icon.Code}
          onAction={() => saveFile(markdownToHtml(markdown), articleTitle, "html")}
        />
      </ActionPanel.Section>

      {/* Open & Share Section */}
      <ActionPanel.Section title="Open & Share">
        {onReimportFromBrowser && (
          <Action
            title="Import from Browser Tab"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onReimportFromBrowser}
          />
        )}
        <Action.OpenInBrowser title="Open in Browser" url={articleUrl} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
