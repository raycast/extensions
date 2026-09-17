import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";

interface NotReadableActionsProps {
  url: string;
  onRetryWithoutCheck: () => void;
  onTryPaywallHopper?: () => void;
}

export function NotReadableActions({ url, onRetryWithoutCheck, onTryPaywallHopper }: NotReadableActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Try Anyway"
        icon={Icon.ArrowRight}
        onAction={onRetryWithoutCheck}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "enter" },
          Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
        }}
      />
      {onTryPaywallHopper && (
        <Action
          title="Try Paywall Hopper"
          icon={Icon.LockUnlocked}
          onAction={onTryPaywallHopper}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "p" }, Windows: { modifiers: ["ctrl"], key: "p" } }}
        />
      )}
      <Action.OpenInBrowser
        title="Open in Browser"
        url={url}
        shortcut={Keyboard.Shortcut.Common.Open}
        icon={Icon.Globe}
      />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}
