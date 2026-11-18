import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

interface PickerLoadErrorProps {
  title: string;
  error: Error;
  isLoading: boolean;
  onRetry: () => void;
}

export function PickerLoadError({ title, error, isLoading, onRetry }: PickerLoadErrorProps) {
  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={title}
        description={error.message}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
