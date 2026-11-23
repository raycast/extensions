import { Action, ActionPanel, Icon } from "@raycast/api";

export function retryActions(revalidate: () => unknown) {
  return (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
    </ActionPanel>
  );
}
