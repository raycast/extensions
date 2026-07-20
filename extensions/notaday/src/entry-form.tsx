import { Action, ActionPanel, Color, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  API_BASE_URL,
  Channel,
  Entry,
  EntryFormValues,
  Tag,
  apiHeaders,
  createEntry,
  parseChannelsResponse,
  parseEntryResponse,
  parseTagsResponse,
  toggleEntryState,
  updateEntry,
} from "./api";

export function EntryForm({
  apiToken,
  entry,
  mode,
  onSaved,
}: {
  apiToken: string;
  entry?: Entry;
  mode: "create" | "edit";
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const { data: latestEntry, isLoading: isLoadingEntry } = useFetch<Entry, Entry | undefined>(
    `${API_BASE_URL}/entries/${entry?.id}`,
    {
      execute: mode === "edit" && Boolean(entry),
      headers: apiHeaders(apiToken),
      parseResponse: parseEntryResponse,
      initialData: entry,
      keepPreviousData: true,
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load entry",
          message: error instanceof Error ? error.message : undefined,
        });
      },
    },
  );
  const { data: channels = [], isLoading: isLoadingChannels } = useFetch<Channel[], Channel[]>(
    `${API_BASE_URL}/channels`,
    {
      headers: apiHeaders(apiToken),
      parseResponse: parseChannelsResponse,
      initialData: [],
    },
  );
  const { data: tags = [], isLoading: isLoadingTags } = useFetch<Tag[], Tag[]>(`${API_BASE_URL}/tags`, {
    headers: apiHeaders(apiToken),
    parseResponse: parseTagsResponse,
    initialData: [],
  });

  const currentEntry = latestEntry ?? entry;
  const isLoading = (mode === "edit" && isLoadingEntry) || isLoadingChannels || isLoadingTags;
  const navigationTitle = mode === "edit" && currentEntry ? `Edit ${currentEntry.title}` : "Create Entry";

  async function handleSubmit(values: EntryFormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: mode === "edit" ? "Updating entry" : "Creating entry",
    });

    try {
      if (mode === "edit" && currentEntry) {
        await updateEntry(apiToken, currentEntry.id, values);
      } else {
        await createEntry(apiToken, values);
      }

      toast.style = Toast.Style.Success;
      toast.title = mode === "edit" ? "Entry updated" : "Entry created";
      onSaved?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = mode === "edit" ? "Could not update entry" : "Could not create entry";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleToggleComplete() {
    if (!currentEntry) {
      return;
    }

    await toggleEntryState({
      apiToken,
      entryId: currentEntry.id,
      action: "toggle-complete",
      loadingTitle: currentEntry.completed ? "Marking entry as open" : "Marking entry as done",
      successTitle: currentEntry.completed ? "Entry marked as open" : "Entry marked as done",
      onSuccess() {
        onSaved?.();
        pop();
      },
    });
  }

  async function handleToggleBacklog() {
    if (!currentEntry) {
      return;
    }

    await toggleEntryState({
      apiToken,
      entryId: currentEntry.id,
      action: "toggle-backlog",
      loadingTitle: currentEntry.backlog ? "Moving entry from backlog" : "Moving entry to backlog",
      successTitle: currentEntry.backlog ? "Entry moved from backlog" : "Entry moved to backlog",
      onSuccess() {
        onSaved?.();
        pop();
      },
    });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm<EntryFormValues>
            title={mode === "edit" ? "Save Entry" : "Create Entry"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {mode === "edit" && currentEntry ? (
            <>
              <Action
                title={currentEntry.completed ? "Mark as Open" : "Mark as Done"}
                icon={currentEntry.completed ? Icon.Circle : Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={handleToggleComplete}
              />
              <Action
                title={currentEntry.backlog ? "Move from Backlog" : "Move to Backlog"}
                icon={Icon.Tray}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                onAction={handleToggleBacklog}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={currentEntry?.title ?? ""} autoFocus />
      <Form.TextArea id="description" title="Description" defaultValue={currentEntry?.description ?? ""} />

      <Form.Dropdown id="type" title="Type" defaultValue={currentEntry?.type === "routine" ? "routine" : "task"}>
        <Form.Dropdown.Item value="task" title="Task" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
        <Form.Dropdown.Item value="routine" title="Routine" icon={{ source: Icon.Repeat, tintColor: Color.Purple }} />
      </Form.Dropdown>

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        defaultValue={currentEntry?.dueDate ? new Date(currentEntry.dueDate) : null}
      />

      <Form.Dropdown id="channelId" title="Channel" defaultValue={currentEntry?.channelId ?? ""}>
        <Form.Dropdown.Item value="" title="No Channel" />
        {channels.map((channel) => (
          <Form.Dropdown.Item
            key={channel.id}
            value={channel.id}
            title={channel.name}
            icon={{ source: Icon.Circle, tintColor: channel.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="tagIds" title="Tags" defaultValue={currentEntry?.tagIds ?? []}>
        {tags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.id}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
