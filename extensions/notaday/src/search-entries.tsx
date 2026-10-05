import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_BASE_URL, ApiError, Entry, MissingApiToken, apiHeaders, getApiToken, parseEntriesResponse } from "./api";
import { EntryForm } from "./entry-form";

export default function Command() {
  const apiToken = getApiToken();

  if (!apiToken) {
    return <MissingApiToken />;
  }

  return <EntriesList apiToken={apiToken} />;
}

function EntriesList({ apiToken }: { apiToken: string }) {
  const { push } = useNavigation();
  const {
    data = [],
    error,
    isLoading,
    revalidate,
  } = useFetch<Entry[], Entry[]>(`${API_BASE_URL}/entries?completed=false`, {
    headers: apiHeaders(apiToken),
    parseResponse: parseEntriesResponse,
    initialData: [],
    keepPreviousData: true,
    onError(error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Could not load entries",
        message: error instanceof Error ? error.message : undefined,
      });
    },
  });

  if (error instanceof ApiError && error.status === 401) {
    return (
      <Detail
        markdown="## Notaday rejected the API token\n\nOpen the extension preferences and paste a valid token."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const editableEntries = data.filter(
    (entry) => entry.type !== "journal" && !entry.completed && entry.timeClass !== "completed",
  );
  const sortedEntries = [...editableEntries].sort((entryA, entryB) => Number(entryA.backlog) - Number(entryB.backlog));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search open entries">
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={error ? "Could Not Load Entries" : "No Open Entries"}
        description={error ? error.message : "There are no current open tasks or routines in Notaday."}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />

      {sortedEntries.map((entry) => (
        <List.Item
          key={entry.id}
          icon={iconForEntry(entry)}
          title={entry.title}
          subtitle={entry.description}
          accessories={accessoriesForEntry(entry)}
          actions={
            <ActionPanel>
              <Action
                title="Edit Entry"
                icon={Icon.Pencil}
                onAction={() => {
                  push(<EntryForm apiToken={apiToken} entry={entry} mode="edit" onSaved={revalidate} />);
                }}
              />
              <Action.CopyToClipboard title="Copy Title" content={entry.title} />
              {entry.description ? (
                <Action.CopyToClipboard title="Copy Description" content={entry.description} />
              ) : null}
              <Action.CopyToClipboard title="Copy Entry ID" content={entry.id} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function iconForEntry(entry: Entry) {
  switch (entry.type) {
    case "journal":
      return { source: Icon.Book, tintColor: Color.Blue };
    case "routine":
      return { source: Icon.Repeat, tintColor: Color.Purple };
    case "task":
      return {
        source: entry.timeClass === "due" ? Icon.Clock : Icon.Circle,
        tintColor: entry.timeClass === "due" ? Color.Red : Color.Green,
      };
  }
}

function accessoriesForEntry(entry: Entry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [{ text: titleCase(entry.type) }];

  if (entry.backlog) {
    accessories.push({ text: "Backlog", tooltip: "Backlog Entry" });
  }

  if (entry.dueDate) {
    accessories.push({ date: new Date(entry.dueDate), tooltip: "Due Date" });
  }

  if (entry.tagIds.length > 0) {
    accessories.push({ icon: Icon.Tag, text: String(entry.tagIds.length), tooltip: "Tags" });
  }

  return accessories;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
