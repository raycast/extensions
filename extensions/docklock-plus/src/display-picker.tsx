import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PickerLoadError } from "./picker-load-error";
import { DockLockDisplay, getDisplays } from "./utils";

interface DisplayPickerProps {
  actionTitle: string;
  emptyTitle: string;
  eligible: (display: DockLockDisplay) => boolean;
  onSelect: (display: DockLockDisplay) => Promise<void>;
}

export function DisplayPicker({ actionTitle, emptyTitle, eligible, onSelect }: DisplayPickerProps) {
  const { data, isLoading, error, revalidate } = usePromise(getDisplays);
  if (error) {
    return <PickerLoadError title="Could Not Load Displays" error={error} isLoading={isLoading} onRetry={revalidate} />;
  }
  const displays = data?.filter(eligible) ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays by name or number">
      {!isLoading && displays.length === 0 && <List.EmptyView title={emptyTitle} />}
      {displays.map((display) => (
        <List.Item
          key={display.id}
          title={display.name}
          subtitle={`Display ${display.number}`}
          keywords={[display.hardwareName, String(display.number), `#${display.number}`]}
          accessories={[
            {
              text: `${display.geometry.width} x ${display.geometry.height}`,
              tooltip: `Position (${display.geometry.x}, ${display.geometry.y})`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title={actionTitle} icon={Icon.Monitor} onAction={() => onSelect(display)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
