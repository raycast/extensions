import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo, useCallback } from "react";
import { EntryType, EntryDateEnum } from "../types";
import { useEntries, useDetailToggle } from "../hooks";
import { EntryItem, EntriesSummary } from "../components";
import { UI_MESSAGES } from "../constants";

interface EntriesViewProps {
  onCancel?: () => void;
  onAddEntry?: () => void;
}

export const EntriesView = ({ onCancel, onAddEntry }: EntriesViewProps) => {
  const { isLoading, filter, filteredEntries, setFilter, error } = useEntries();
  const { isShowingDetail, toggleDetail } = useDetailToggle(false);

  const handleFilterChange = useCallback(
    (newValue: string) => {
      // Validate that the newValue is a valid EntryDateEnum value
      if (Object.values(EntryDateEnum).includes(newValue as EntryDateEnum)) {
        setFilter(newValue as EntryDateEnum);
      }
    },
    [setFilter],
  );

  const dropdownItems = useMemo(() => {
    return Object.values(EntryDateEnum).map((value) => (
      <List.Dropdown.Item key={value} title={value} value={value} />
    ));
  }, []);

  const entryItems = useMemo(() => {
    if (!filteredEntries || !Array.isArray(filteredEntries)) {
      return [];
    }
    return filteredEntries.map((entry: EntryType) => (
      <EntryItem
        key={entry.id}
        entry={entry}
        isShowingDetail={isShowingDetail}
        onToggleDetail={toggleDetail}
        onCancel={onCancel}
      />
    ));
  }, [filteredEntries, isShowingDetail, toggleDetail, onCancel]);

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Day"
          value={filter}
          onChange={handleFilterChange}
        >
          {dropdownItems}
        </List.Dropdown>
      }
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          {onAddEntry && (
            <Action
              title="Add Entry"
              icon={Icon.Plus}
              onAction={onAddEntry}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
          {onCancel && (
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={onCancel}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          )}
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title={UI_MESSAGES.ENTRIES.ERROR_TITLE}
          description={error.message || UI_MESSAGES.ENTRIES.ERROR_DESCRIPTION}
        />
      ) : (
        <>
          <EntriesSummary entries={filteredEntries} onCancel={onCancel} />
          {entryItems.length > 0 ? (
            <List.Section title={`${filter} Entries`}>
              {entryItems}
            </List.Section>
          ) : (
            !error && (
              <List.EmptyView
                title={`No entries for ${filter.toLowerCase()}`}
                description="Start tracking time to see your entries here"
                icon={Icon.Clock}
              />
            )
          )}
        </>
      )}
    </List>
  );
};
