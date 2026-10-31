import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import { TestConnection } from "./test-connection";

/**
 * Last in every action panel: setup help, kept out of root search since it's rarely needed.
 * Never first or second, where Raycast would give it ↵ or ⌘↵ in one panel and not in the others.
 */
export function ExtensionActions({ preferences = true }: { preferences?: boolean }) {
  return (
    <ActionPanel.Section title="Extension">
      <Action.Push
        title="Test Connection"
        icon={Icon.Plug}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        target={<TestConnection />}
      />
      {preferences && <PreferencesAction />}
    </ActionPanel.Section>
  );
}

export function PreferencesAction() {
  return <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}

/** For lists that couldn't load: retry, then the extension's setup. */
export function RetryActions({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <PreferencesAction />
      <ExtensionActions preferences={false} />
    </>
  );
}
