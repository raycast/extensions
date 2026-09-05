import { Action, ActionPanel, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { OpenGrokBotAction } from "./open-grok-bot-action";

export type ChromeKind = "prefs" | "retry" | "refresh";

export function ChromeActions({ kind, onRefresh }: { kind: ChromeKind; onRefresh: () => void }) {
  const refresh = (
    <Action
      title={kind === "retry" ? "Retry" : "Refresh"}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
  const prefs = <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;

  switch (kind) {
    case "prefs":
      return (
        <>
          <OpenGrokBotAction />
          {prefs}
          {refresh}
        </>
      );
    case "retry":
    case "refresh":
      return (
        <>
          <OpenGrokBotAction />
          {refresh}
          {prefs}
        </>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ChromeActionPanel({ kind, onRefresh }: { kind: ChromeKind; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <ChromeActions kind={kind} onRefresh={onRefresh} />
    </ActionPanel>
  );
}
