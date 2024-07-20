import { Action, ActionPanel, Clipboard, closeMainWindow, open, popToRoot } from "@raycast/api";

export const handleOpenLink = (url: string) => {
  open(url);
  popToRoot();
  closeMainWindow();
};

export const handleCopyToClipboard = (url: string) => {
  Clipboard.copy(url);
  closeMainWindow();
};

export const generateSearchKeywords = (phrase: string) => {
  return phrase.split(/[\s-)(]+/);
};

export const getActions = (url: string) => {
  return <>
    <ActionPanel>
      <Action title="Open"
              onAction={() => handleOpenLink(url)} />
      <Action title="Copy to Clipboard" onAction={() => handleCopyToClipboard(url)} />
    </ActionPanel>
  </>;
};