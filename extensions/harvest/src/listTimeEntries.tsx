import { ActionPanel, ActionPanelItem, Color, Icon, List, ListItem, PushAction } from "@raycast/api";
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

  function ToggleTimerAction({ entry }: { entry: HarvestTimeEntry }) {
    return (
      <ActionPanelItem
        title={entry.is_running ? "Stop Timer" : "Start Timer"}
        icon={Icon.Clock}
        onAction={() => {
          if (entry.is_running) {
            stopTimer(entry);
          } else {
            restartTimer(entry);
          }
          init();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <NewEntryAction />
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
                <ToggleTimerAction entry={entry} />
                <EditEntryAction />
                <NewEntryAction />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function NewEntryAction() {
  return (
    <PushAction target={<New />} title="New Time Entry" shortcut={{ key: "n", modifiers: ["cmd"] }} icon={Icon.Plus} />
  );
}
function EditEntryAction() {
  return (
    <PushAction
      target={<New />}
      title="Edit Time Entry"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
    />
  );
}
