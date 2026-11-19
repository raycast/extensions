import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";

/**
 * Takes the place of an empty list when loading failed, so a failure never reads as
 * "nothing here" once the failure toast is gone.
 */
export function ListErrorView({
  error,
  what,
  onRetry,
}: {
  error: Error;
  what: string;
  onRetry: () => void;
}) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={`Could not load ${what}`}
      description={error.message}
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
