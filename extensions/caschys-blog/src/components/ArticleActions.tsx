import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Article } from "../utils";
import SubmitTip from "../submit-tip";
import ArticleDetail from "./ArticleDetail";

interface ArticleActionsProps {
  article: Article;
  onRefresh?: (() => void) | undefined;
  showSubmitTip?: boolean;
}

export default function ArticleActions({ article, onRefresh, showSubmitTip = false }: ArticleActionsProps) {
  return (
    <ActionPanel>
      <Action.Push title="Show Article" icon={Icon.Eye} target={<ArticleDetail article={article} />} />
      <Action.OpenInBrowser
        title="Open in Browser"
        url={article.link}
        icon={Icon.Globe}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.CopyToClipboard title="Copy Link" content={article.link} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      {onRefresh ? (
        <Action
          title="Refresh Articles"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      ) : null}
      {showSubmitTip ? (
        <ActionPanel.Section title="Navigation">
          <Action.Push
            title="Submit Tip"
            icon={Icon.Envelope}
            target={<SubmitTip />}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
