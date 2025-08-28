import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";
import { ManageScheduledCommand } from "./ManageScheduledCommand";
import { ViewLogs } from "./view-logs";
import { useScheduledCommands } from "./hooks/useScheduledCommands";
import { getScheduleDescription, getScheduleIcon } from "./utils";

export default function ScheduledCommandsList() {
  const { commands, isLoading, deleteCommand, toggleCommand, loadCommands } = useScheduledCommands();
  const [filter, setFilter] = useState<"all" | "once" | "daily" | "weekly" | "monthly">("all");

  const filteredCommands = commands.filter((command) => {
    if (filter === "all") return true;
    return command.schedule.type === filter;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by schedule type"
          value={filter}
          onChange={(newValue) => setFilter(newValue as typeof filter)}
        >
          <List.Dropdown.Item title="All Commands" value="all" />
          <List.Dropdown.Item title="One-time" value="once" />
          <List.Dropdown.Item title="Daily" value="daily" />
          <List.Dropdown.Item title="Weekly" value="weekly" />
          <List.Dropdown.Item title="Monthly" value="monthly" />
        </List.Dropdown>
      }
    >
      {filteredCommands.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No scheduled commands"
          description="Create your first scheduled command to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Command"
                icon={Icon.Plus}
                target={<ManageScheduledCommand onSave={loadCommands} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredCommands.map((command) => (
          <List.Item
            key={command.id}
            icon={getScheduleIcon(command.schedule.type)}
            title={command.name}
            subtitle={command.command.deeplink}
            accessories={[
              {
                text: getScheduleDescription(command.schedule),
                icon: command.enabled ? Icon.Checkmark : Icon.Xmark,
                tooltip: command.enabled ? "Enabled" : "Disabled",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Schedule"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<ManageScheduledCommand command={command} onSave={loadCommands} />}
                  />
                  <Action
                    title={command.enabled ? "Disable" : "Enable"}
                    icon={command.enabled ? Icon.Xmark : Icon.Checkmark}
                    onAction={() => toggleCommand(command.id)}
                  />
                  <Action
                    title="Remove Schedule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteCommand(command.id)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Schedule"
                    icon={Icon.Plus}
                    target={<ManageScheduledCommand onSave={loadCommands} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action.Push title="View Execution Logs" icon={Icon.Document} target={<ViewLogs />} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
