import { Action, ActionPanel, Alert, confirmAlert, Icon, LaunchProps, List, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { getAllEntries, deleteEntry, saveEntry } from "./storage";
import { ValueEntry } from "./types";
import { ValueListItem } from "./value-list-item";
import AddValueForm from "./add-value";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments?.query ?? "");
  const [isMutating, setIsMutating] = useState(false);
  const { isLoading, data: entries, error, revalidate } = usePromise(getAllEntries, []);

  useEffect(() => {
    if (error) {
      showFailureToast(error, { title: "Failed to load values" });
    }
  }, [error]);

  const runMutation = useCallback(
    async (action: () => Promise<void>, successMessage: string, failureTitle: string) => {
      setIsMutating(true);
      try {
        await action();
        await revalidate();
        showHUD(successMessage);
      } catch (e) {
        showFailureToast(e, { title: failureTitle });
      } finally {
        setIsMutating(false);
      }
    },
    [revalidate],
  );

  const handleDelete = useCallback(
    async (id: string, label: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Value",
        message: `Are you sure you want to delete "${label}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
      await runMutation(() => deleteEntry(id), "Value deleted", "Failed to delete value");
    },
    [runMutation],
  );

  const handleDuplicate = useCallback(
    async (entry: ValueEntry) => {
      const now = Date.now();
      const newEntry: ValueEntry = {
        id: uuidv4(),
        label: `${entry.label} (copy)`,
        value: entry.value,
        type: entry.type,
        createdAt: now,
        updatedAt: now,
      };
      await runMutation(() => saveEntry(newEntry), "Value duplicated", "Failed to duplicate value");
    },
    [runMutation],
  );

  const sortedEntries = useMemo(
    () => (entries ? [...entries].sort((a, b) => b.updatedAt - a.updatedAt) : []),
    [entries],
  );

  return (
    <List
      isLoading={isLoading || isMutating}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
      searchBarPlaceholder="Search values..."
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add Value"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<AddValueForm onSave={revalidate} isPushed={true} />}
          />
        </ActionPanel>
      }
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView icon={Icon.Box} title="No values yet" description="Press ⌘N to add your first value." />
      ) : (
        sortedEntries.map((entry) => (
          <ValueListItem
            key={entry.id}
            entry={entry}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUpdate={revalidate}
          />
        ))
      )}
    </List>
  );
}
