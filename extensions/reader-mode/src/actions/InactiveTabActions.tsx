import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";

interface InactiveTabActionsProps {
  url: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function InactiveTabActions({ url, onRetry, onCancel }: InactiveTabActionsProps) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action.OpenInBrowser
        title="Reopen URL in Browser"
        url={url}
        icon={Icon.Globe}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action title="Cancel" icon={Icon.XMarkCircle} onAction={onCancel} />
    </ActionPanel>
  );
}
