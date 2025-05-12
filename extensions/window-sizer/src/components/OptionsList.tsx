import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
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
        icon={{ source: "icons/maximize.svg", fallback: Icon.Maximize, tintColor: Color.SecondaryText }}
        title="Maximize Window"
        actions={
          <ActionPanel>
            <Action
              title="Maximize Window"
              onAction={onMaximizeWindow}
              icon={{ source: "icons/maximize.svg", fallback: Icon.Maximize, tintColor: Color.PrimaryText }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: "icons/restore.svg", fallback: Icon.RotateAntiClockwise, tintColor: Color.SecondaryText }}
        title="Restore Previous Size"
        actions={
          <ActionPanel>
            <Action
              title="Restore Previous Size"
              onAction={onRestorePreviousSize}
              icon={{ source: "icons/restore.svg", fallback: Icon.RotateAntiClockwise, tintColor: Color.PrimaryText }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: "icons/current-size.svg", fallback: Icon.Info, tintColor: Color.SecondaryText }}
        title="Get Current Size"
        actions={
          <ActionPanel>
            <Action
              title="Get Current Size"
              onAction={onGetCurrentWindowSize}
              icon={{ source: "icons/current-size.svg", fallback: Icon.Info, tintColor: Color.PrimaryText }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: "icons/add-size.svg", fallback: Icon.PlusSquare, tintColor: Color.SecondaryText }}
        title="Add Custom Size"
        actions={
          <ActionPanel>
            <Action
              title="Add Custom Size"
              onAction={onAddCustomResolution}
              icon={{ source: "icons/add-size.svg", fallback: Icon.PlusSquare, tintColor: Color.PrimaryText }}
            />
          </ActionPanel>
        }
      />

      <DevTools />
    </List.Section>
  );
}
