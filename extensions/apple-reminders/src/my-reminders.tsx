import { Action, ActionPanel, Color, Icon, Keyboard, List, clearSearchBar, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import CompletedRemindersAction from "./components/CompletedRemindersAction";
import ReminderListItem from "./components/ReminderListItem";
import { CreateReminderForm } from "./create-reminder";
import { useData } from "./hooks/useData";
import { useDebouncedSearchText } from "./hooks/useDebouncedSearchText";
import useViewReminders from "./hooks/useViewReminders";

export default function Command() {
  const { displayCompletionDate } = getPreferenceValues<Preferences.MyReminders>();
  const [listId, setListId] = useCachedState<string>("view", "today");
  const [searchText, setSearchText] = useState("");
  const { debouncedSearchText, isSearchPending } = useDebouncedSearchText(searchText);

  const { data, lists, isLoading, error, mutate } = useData(listId, debouncedSearchText, { execute: !isSearchPending });

  const { sections, viewProps, hasMoreReminders, isLoadingCompletedReminders } = useViewReminders(listId, {
    data,
    searchText: debouncedSearchText,
    execute: !isSearchPending,
  });

  async function refresh() {
    if (isSearchPending) return;
    await Promise.all([mutate(), viewProps.completed.value ? viewProps.completed.mutate?.() : undefined]);
  }

  const isFetching = isSearchPending || isLoading || isLoadingCompletedReminders;
  const fetchError = !isFetching ? error : undefined;
  const placeholder =
    listId === "all" ? "Filter by title, notes, priority, tags or list" : "Filter by title, notes, priority or tags";

  return (
    <List
      isLoading={isFetching}
      navigationTitle={hasMoreReminders ? "My Reminders · Search to Narrow Results" : "My Reminders"}
      searchBarPlaceholder={placeholder}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by List" onChange={setListId} value={listId}>
          {lists.length > 0 || error ? (
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

              {lists.map((list) => {
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
                    lists={lists}
                    mutate={mutate}
                  />
                );
              })}
            </List.Section>
          ),
      )}

      <List.EmptyView
        title={isFetching ? "Loading Reminders" : fetchError ? "Unable to Load Reminders" : "No Reminders"}
        description={
          isFetching
            ? "Waiting for reminder results."
            : fetchError
              ? fetchError.message
              : "Create a new reminder by pressing the ⏎ key."
        }
        actions={
          <ActionPanel>
            {!isFetching && !fetchError ? (
              <Action.Push
                title="Create Reminder"
                icon={Icon.Plus}
                target={<CreateReminderForm draftValues={{ title: searchText }} listId={listId} mutate={mutate} />}
                onPop={() => clearSearchBar()}
              />
            ) : null}

            <CompletedRemindersAction completed={viewProps.completed} />

            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
