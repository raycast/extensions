import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { SummaryStyle } from "../types/summary";
import { ArchiveSource } from "../utils/paywall-hopper";
import { getStyleLabel } from "../utils/summarizer";

export const SUMMARY_STYLES: { style: SummaryStyle; icon: Icon }[] = [
  { style: "overview", icon: Icon.List },
  { style: "arc-style", icon: Icon.Stars },
  { style: "opposite-sides", icon: Icon.Switch },
  { style: "five-ws", icon: Icon.QuestionMark },
  { style: "eli5", icon: Icon.SpeechBubble },
  { style: "translated", icon: Icon.Globe },
  { style: "entities", icon: Icon.Person },
];

interface ArticleActionsProps {
  articleUrl: string;
  markdown: string;
  currentSummary: string | null;
  canAccessAI: boolean;
  onSummarize: (style: SummaryStyle) => void;
  onReimportFromBrowser?: () => void;
  archiveSource?: ArchiveSource;
}

export function ArticleActions({
  articleUrl,
  markdown,
  currentSummary,
  canAccessAI,
  onSummarize,
  onReimportFromBrowser,
  archiveSource,
}: ArticleActionsProps) {
  return (
    <ActionPanel>
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
      {currentSummary && (
        <Action.CopyToClipboard
          title="Copy Summary"
          content={currentSummary}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        />
      )}
      <Action.CopyToClipboard title="Copy as Markdown" content={markdown} shortcut={Keyboard.Shortcut.Common.Copy} />
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
