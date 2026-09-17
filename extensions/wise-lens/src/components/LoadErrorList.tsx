import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ReactElement } from "react";

interface Props {
  error: Error;
  onRetry: () => void;
}

export function LoadErrorList({ error, onRetry }: Props) {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        title="Couldn't load Wise"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function renderLoadErrorList(
  isLoading: boolean,
  data: unknown,
  error: Error | undefined,
  onRetry: () => void,
): ReactElement | null {
  if (!isLoading && !data && error) {
    return <LoadErrorList error={error} onRetry={onRetry} />;
  }
  return null;
}
