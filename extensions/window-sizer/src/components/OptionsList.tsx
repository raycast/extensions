import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { DevTools } from "./DevTools";

interface OptionsListProps {
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onAddCustomResolution: () => Promise<void>;
  onMaximizeWindow: () => Promise<void>;
}

/**
 * OptionsList component displays window operation options
 */
export function OptionsList({
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onAddCustomResolution,
  onMaximizeWindow,
}: OptionsListProps) {
  return (
    <List.Section title="Options">
      <List.Item
        icon={Icon.Maximize}
        title="Maximize Window"
        actions={
          <ActionPanel>
            <Action title="Maximize Window" onAction={onMaximizeWindow} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.RotateAntiClockwise}
        title="Restore Previous Size"
        actions={
          <ActionPanel>
            <Action title="Restore Previous Size" onAction={onRestorePreviousSize} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Info}
        title="Get Current Size"
        actions={
          <ActionPanel>
            <Action title="Get Current Size" onAction={onGetCurrentWindowSize} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.PlusSquare}
        title="Add Custom Size"
        actions={
          <ActionPanel>
            <Action title="Add Custom Size" onAction={onAddCustomResolution} />
          </ActionPanel>
        }
      />

      <DevTools />
    </List.Section>
  );
}
