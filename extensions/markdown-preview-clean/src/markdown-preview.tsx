import { useEffect } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { marked } from "marked";
import { openMarkdownInBrowser } from "./browser-html";
import { saveToHistory } from "./history";
import { shareToMdshare } from "./mdshare";

marked.setOptions({
  breaks: true,
  gfm: true,
});

function getStats(markdown: string) {
  const characters = markdown.length;
  const words = markdown.split(/\s+/).filter((word) => word.length > 0).length;
  const lines = markdown.length === 0 ? 0 : markdown.split("\n").length;
  return { characters, words, lines };
}

interface MarkdownPreviewProps {
  markdown: string;
  backTitle?: string;
  saveHistory?: boolean;
  /** Absolute path to source .md — enables relative images in browser preview */
  filePath?: string;
  navigationTitle?: string;
}

export function MarkdownPreview({
  markdown,
  backTitle = "Back",
  saveHistory = true,
  filePath,
  navigationTitle,
}: MarkdownPreviewProps) {
  const { pop } = useNavigation();
  const htmlContent = marked(markdown) as string;
  const stats = getStats(markdown);

  useEffect(() => {
    if (!saveHistory || !markdown.trim()) return;
    void saveToHistory(markdown);
  }, [markdown, saveHistory]);

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Preview">
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={async () => {
                try {
                  await openMarkdownInBrowser(markdown, {
                    filePath,
                    subtitle: filePath ? filePath : undefined,
                  });
                  await showToast({ style: Toast.Style.Success, title: "Opened in browser" });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to open browser",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
            <Action
              title={backTitle}
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={pop}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Share">
            <Action
              title="Share Via Mdshare"
              icon={Icon.Link}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading to mdshare…" });
                try {
                  const result = await shareToMdshare(markdown);
                  await Clipboard.copy(result.viewUrl);
                  toast.style = Toast.Style.Success;
                  toast.title = "View link copied";
                  toast.message = result.viewUrl;
                  toast.primaryAction = {
                    title: "Open Link",
                    onAction: () => open(result.viewUrl),
                  };
                  toast.secondaryAction = {
                    title: "Copy Admin URL",
                    onAction: () => Clipboard.copy(result.adminUrl),
                  };
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Share failed";
                  toast.message = error instanceof Error ? error.message : String(error);
                }
              }}
            />
            <Action.CopyToClipboard
              title="Copy Markdown"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy HTML" content={htmlContent} shortcut={Keyboard.Shortcut.Common.Copy} />
            {filePath ? <Action.CopyToClipboard title="Copy File Path" content={filePath} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Show Stats"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Content stats",
                  message: `${stats.characters} chars · ${stats.words} words · ${stats.lines} lines`,
                })
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
