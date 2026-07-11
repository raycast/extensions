import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { type Suggestion } from "../google";
import { getSubtitle } from "../utils";

interface SuggestionListItemProps {
  suggestion: Suggestion;
  onSuggestionAction?: () => void;
}

export function SuggestionListItem({ suggestion, onSuggestionAction }: SuggestionListItemProps) {
  return (
    <List.Item
      icon={getFavicon(suggestion.url, { mask: Image.Mask.Circle })}
      title={suggestion.query}
      subtitle={{ value: getSubtitle(suggestion.url), tooltip: suggestion.url }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              icon={Icon.Globe}
              title="Open Tab"
              target={suggestion.url}
              application="company.thebrowser.dia"
              onOpen={() => {
                onSuggestionAction?.();
              }}
            />
            <Action.OpenWith
              icon={Icon.AppWindow}
              path={suggestion.url}
              onOpen={() => {
                onSuggestionAction?.();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={suggestion.url}
              title="Copy URL"
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              content={{ html: `<a href="${suggestion.url}">${suggestion.query}</a>` }}
              title="Copy Formatted URL"
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            <Action.CopyToClipboard
              content={suggestion.query}
              title="Copy Query"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard content={`[${suggestion.query}](${suggestion.url})`} title="Copy as Markdown" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CreateQuicklink
              quicklink={{ link: suggestion.url, name: suggestion.query }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
