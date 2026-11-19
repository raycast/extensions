import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PickerLoadError } from "./picker-load-error";
import { getMovement, movementModes, runAction } from "./utils";

export default function Command() {
  const { data: current, isLoading, error, revalidate } = usePromise(getMovement);
  if (error) {
    return (
      <PickerLoadError title="Could Not Load Movement Modes" error={error} isLoading={isLoading} onRetry={revalidate} />
    );
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a Dock movement mode">
      {current &&
        Object.entries(movementModes).map(([mode, title]) => (
          <List.Item
            key={mode}
            title={title}
            accessories={current === mode ? [{ icon: Icon.Checkmark, text: "Current" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Set Movement Mode"
                  onAction={() => runAction(["dock", "movement", mode], `Movement set to ${title}`)}
                />
                <Action.OpenInBrowser
                  title="View App Rules Guide"
                  url="https://docklockpro.com/docks/cli-plus/#app-rules"
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
