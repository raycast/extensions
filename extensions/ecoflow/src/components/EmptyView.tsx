import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export function EmptyView({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: Error | undefined;
  onRetry(): void;
}) {
  if (isLoading) return null;

  return (
    <List.EmptyView
      icon={error ? Icon.ExclamationMark : Icon.Battery}
      title={error ? "Could Not Load EcoFlow Devices" : "No EcoFlow Devices"}
      description={
        error
          ? error.message
          : "This developer account has no directly bound devices. Shared devices are not returned by EcoFlow's API."
      }
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
