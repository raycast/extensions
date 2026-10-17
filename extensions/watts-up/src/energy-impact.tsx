import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getTopEnergyProcesses } from "./energy";

export default function Command() {
  const { data, isLoading, revalidate, error } = usePromise(
    getTopEnergyProcesses,
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Read Energy Impact"
          description={`Running \`top\` failed: ${error.message}`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section
        title="Top Energy Impact"
        subtitle="same scale as Activity Monitor · sampled over ~2s"
      >
        {data?.map((proc) => (
          <List.Item
            key={proc.pid}
            icon={proc.isApp ? Icon.AppWindow : Icon.Terminal}
            title={proc.name}
            subtitle={`PID ${proc.pid}`}
            accessories={[{ text: proc.power.toFixed(1) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard
                  title="Copy Process Name"
                  content={proc.name}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
