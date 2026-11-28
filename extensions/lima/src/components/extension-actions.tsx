import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

/**
 * Last in every action panel: setup help, kept out of the way since it's rarely needed.
 * Never first or second, where Raycast would give it ↵ or ⌘↵ in one panel and not in the others.
 */
export function ExtensionActions({ preferences = true }: { preferences?: boolean }) {
  return (
    <ActionPanel.Section title="Extension">
      {preferences && <PreferencesAction />}
      <Action.OpenInBrowser title="Open Lima Docs" icon={Icon.Book} url="https://lima-vm.io/docs/" />
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
