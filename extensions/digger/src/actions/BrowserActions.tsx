import { Action, Icon, Keyboard } from "@raycast/api";

interface BrowserActionsProps {
  url: string;
}

export function BrowserActions({ url }: BrowserActionsProps) {
  return (
    <Action.OpenInBrowser
      title="Open in Browser"
      url={url}
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
