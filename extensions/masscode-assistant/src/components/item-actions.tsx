import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { Preferences, Snippet } from "../types";

interface ItemActionsProps {
  snippet: Snippet;
  handleAction: (snippet: Snippet) => void;
}

export function ItemActions({ snippet, handleAction }: ItemActionsProps) {
  const preferences = getPreferenceValues<Preferences>();

  const actions = [
    <Action.CopyToClipboard
      key={0}
      content={snippet.content[0].value}
      onCopy={() => {
        handleAction(snippet);
      }}
    />,
    <Action.Paste
      key={1}
      content={snippet.content[0].value}
      onPaste={() => {
        handleAction(snippet);
      }}
    />,
  ];

  // If paste on enter reverse the actions as the first is what raycast picks up as the default action
  // i.e. the one which will happen on enter
  preferences.paste_on_enter && actions.reverse();

  return (
    <ActionPanel title="Actions">
      <ActionPanel.Section>{actions}</ActionPanel.Section>
    </ActionPanel>
  );
}
