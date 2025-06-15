import { Action, ActionPanel, Color, Icon, List, clearSearchBar, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import ReminderListItem from "./components/ReminderListItem";
import { CreateReminderForm } from "./create-reminder";
import { useData } from "./hooks/useData";
import useViewReminders from "./hooks/useViewReminders";

export default function Command() {
  const { displayCompletionDate } = getPreferenceValues<Preferences.MyReminders>();
  const [listId, setListId] = useCachedState<string>("view", "today");
  const [newReminderTitle, setNewReminderTitle] = useState("");

  const { data, isLoading, mutate } = useData();

  const { sections, viewProps } = useViewReminders(listId, { data });

  const placeholder =
    listId === "all" ? "Filter by title, notes, priority or list" : "Filter by title, notes or priority";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholder}
      onSearchTextChange={setNewReminderTitle}
      filtering={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by List" onChange={setListId} value={listId}>
          {data?.lists && data.lists.length > 0 ? (
            <>
              <List.Dropdown.Section>
                <List.Dropdown.Item
                  title="Overdue"
                  icon={{ source: Icon.CheckList, tintColor: Color.Orange }}
                  value="overdue"
                />
                <List.Dropdown.Item
                  title="Today"
                  icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  value="today"
                />
                <List.Dropdown.Item
                  title="Scheduled"
                  icon={{ source: Icon.Calendar, tintColor: Color.Red }}
                  value="scheduled"
                />
                <List.Dropdown.Item title="All" icon={Icon.Tray} value="all" />
              </List.Dropdown.Section>

              {data?.lists.map((list) => {
                return (
                  <List.Dropdown.Item
                    key={list.id}
                    title={list.title}
                    value={list.id}
                    icon={{ source: Icon.Circle, tintColor: list.color }}
                  />
                );
              })}
            </>
          ) : null}
        </List.Dropdown>
      }
    >
      {sections.map(
        (section) =>
          section.reminders.length > 0 && (
            <List.Section key={section.title} title={section.title} subtitle={section.subtitle}>
              {section.reminders.map((reminder) => {
                return (
                  <ReminderListItem
                    key={reminder.id}
                    reminder={reminder}
                    displayCompletionDate={displayCompletionDate}
                    viewProps={viewProps}
                    listId={listId}
                    mutate={mutate}
                  />
                );
              })}
            </List.Section>
          ),
      )}

      <List.EmptyView
        title="No Reminders"
        description="Create a new reminder by pressing the ⏎ key."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Reminder"
              icon={Icon.Plus}
              target={<CreateReminderForm draftValues={{ title: newReminderTitle }} listId={listId} mutate={mutate} />}
              onPop={() => clearSearchBar()}
            />

            <Action
              title={`${viewProps.completed.value ? "Hide" : "Display"} Completed Reminders`}
              icon={viewProps.completed.value ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={() => viewProps.completed.toggle()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
