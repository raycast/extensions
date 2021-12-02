import { ActionPanel, ActionPanelItem, Color, Icon, List, ListItem, PushAction, Toast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { getMyTimeEntries, restartTimer, stopTimer } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";
import New from "./new";

export default function Command() {
  const [items, setItems] = useState<HarvestTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function init() {
    const timeEntries = await getMyTimeEntries({ from: new Date(), to: new Date() });
    setItems(timeEntries);
    setIsLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <NewEntryAction onSave={init} />
        </ActionPanel>
      }
    >
      {items.map((entry) => {
        return (
          <ListItem
            id={entry.id.toString()}
            key={entry.id}
            title={entry.project.name}
            accessoryTitle={`${entry.client.name}${entry.client.name && entry.task.name ? " | " : ""}${
              entry.task.name
            }`}
            subtitle={entry.notes}
            keywords={entry.notes.split(" ")}
            icon={entry.is_running ? { tintColor: Color.Orange, source: Icon.Clock } : undefined}
            actions={
              <ActionPanel>
                <ToggleTimerAction entry={entry} onComplete={init} />
                <EditEntryAction onSave={init} />
                <NewEntryAction onSave={init} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function NewEntryAction({
  onSave = () => {
    return null;
  },
}: {
  onSave: () => void;
}) {
  return (
    <PushAction
      target={<New onSave={onSave} />}
      title="New Time Entry"
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      icon={Icon.Plus}
    />
  );
}
function EditEntryAction({
  onSave = () => {
    return null;
  },
}: {
  onSave: () => void;
}) {
  return (
    <PushAction
      target={<New onSave={onSave} />}
      title="Edit Time Entry"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
    />
  );
}

function ToggleTimerAction({ entry, onComplete }: { entry: HarvestTimeEntry; onComplete: () => void }) {
  return (
    <ActionPanelItem
      title={entry.is_running ? "Stop Timer" : "Start Timer"}
      icon={Icon.Clock}
      onAction={async () => {
        const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
        await toast.show();
        if (entry.is_running) {
          await stopTimer(entry);
        } else {
          await restartTimer(entry);
        }
        onComplete();
        await toast.hide();
      }}
    />
  );
}
