import {
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  showToast,
  Toast,
  getPreferenceValues,
  showInFinder,
  open,
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
import { isMacOS } from "../utils/host-api";

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
        // showInFinder is macOS-only; on Windows it fails and the action does nothing.
        title: isMacOS ? "Reveal in Finder" : "Show in Folder",
        onAction: async () => {
          if (isMacOS) {
            await showInFinder(filepath);
          } else {
            await open(saveDir);
          }
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Save Failed",
      message,
      primaryAction: {
        title: "Copy Error",
        shortcut: Keyboard.Shortcut.Common.Copy,
        onAction: async () => {
          await Clipboard.copy(message);
        },
      },
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
          // No Common shortcut means "summarize", and the obvious ⌘S is Common.Save — which
          // belongs to "Save as Markdown" below. Declared per platform so the Windows build
          // does not inherit a bare ⌘ binding that means nothing there.
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "m" },
            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
          }}
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
          // Common.Copy is "Copy as Markdown" above; CopyPath is the address-shaped sibling.
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        {archiveSource?.url && (
          <Action.CopyToClipboard
            title="Copy Archived URL"
            content={archiveSource.url}
            icon={Icon.Clock}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
            }}
          />
        )}
        <Action
          title="Save as Markdown"
          icon={Icon.Document}
          shortcut={Keyboard.Shortcut.Common.Save}
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
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReimportFromBrowser}
          />
        )}
        <Action.OpenInBrowser title="Open in Browser" url={articleUrl} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
