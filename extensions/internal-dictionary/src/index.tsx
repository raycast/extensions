import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
import Fuse from "fuse.js";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const DictionaryEntry = z
  .object({
    id: z.string().cuid2(),
    title: z.string(),
    description: z.string(),
    score: z.number(),
  })
  .partial({ score: true });
type DictionaryEntry = z.infer<typeof DictionaryEntry>;

const DictionaryEntryList = DictionaryEntry.array();
type DictionaryEntryList = z.infer<typeof DictionaryEntryList>;

export default function Command() {
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const displayEntries = results.length > 0 ? results : entries;
  if (entries == null) {
    LocalStorage.allItems().then((storageEntries) => {
      const parsedEntries: DictionaryEntry[] = Object.entries(storageEntries).map(([_, e]) => JSON.parse(e));
      setEntries(parsedEntries);
    });
  }

  const options: Fuse.IFuseOptions<DictionaryEntry> = {
    includeScore: true,
    keys: ["title", "description"],
  };

  function handleCreate(entry: DictionaryEntry) {
    LocalStorage.setItem(entry.id, JSON.stringify(entry)).then(() => {
      const newEntries = [...(entries || []), entry];
      setEntries(newEntries);
    });
  }

  function handleEdit(entry: DictionaryEntry) {
    if (!entries) {
      return;
    }
    const idx = entries.map((e) => e.id).indexOf(entry.id);
    if (idx <= -1) {
      return;
    }
    const newEntries = [...entries];
    newEntries[idx] = entry;
    LocalStorage.setItem(entry.id, JSON.stringify(entry)).then(() => setEntries(newEntries));
  }

  function handleDelete(entry: DictionaryEntry) {
    if (!entries) {
      return;
    }
    const idx = entries.map((e) => e.id).indexOf(entry.id);
    if (idx <= -1) {
      return;
    }
    confirmAlert({ title: "Delete " + entry.title + "?" }).then((confirmed) => {
      if (confirmed) {
        const newEntries = [...entries];
        newEntries.splice(idx, 1);
        LocalStorage.removeItem(entry.id).then(() => setEntries(newEntries));
      }
    });
  }

  useEffect(() => {
    const fuse = new Fuse(entries || [], options);
    if (searchQuery.length == 0) {
      setResults(entries || []);
    } else {
      setResults(fuse.search(searchQuery).map((entry) => ({ ...entry.item, score: entry.score })));
    }
  }, [searchQuery, entries]);

  const tryImportFromClipboard = () => {
    Clipboard.read().then(({ text }) => {
      let clipboardObj: any = null;
      try {
        clipboardObj = JSON.parse(text);
      } catch (e) {
        showToast({
          title: "Illformed JSON",
          message: "Couldn't parse the text from the clipboard as JSON.",
          style: Toast.Style.Failure,
        });
        return;
      }

      const result = DictionaryEntryList.safeParse(clipboardObj);
      if (!result.success) {
        const { error } = result;
        showToast({
          title: "Schema Validation Failed",
          message:
            "Errors: " +
            error.issues.map((issue) => issue.path[issue.path.length - 1] + ": " + issue.message).join(", "),
          style: Toast.Style.Failure,
        });
        return;
      }

      const { data: parsedItems } = result;
      parsedItems!.map((item) => LocalStorage.setItem(item.id, JSON.stringify(item)));

      LocalStorage.allItems().then((storageEntries) => {
        const parsedEntries: DictionaryEntry[] = Object.entries(storageEntries).map(([_, e]) => JSON.parse(e));
        setSearchQuery("");
        setEntries(parsedEntries);
        showToast({
          title: "Import Successful",
          message: "Imported " + parsedItems.length + " item" + (parsedItems.length > 1 ? "s" : ""),
          style: Toast.Style.Success,
        });
      });
    });
  };

  const bulkActions = (
    <ActionPanel.Section title="Clipboard Actions">
      <Action
        title="Export All"
        shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
        icon={Icon.Clipboard}
        onAction={() => {
          Clipboard.copy(JSON.stringify(entries, undefined, 2));
          showToast({ title: "Copied All Entries" });
        }}
      />
      <Action
        title="Import From"
        icon={Icon.ArrowDownCircle}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={() => tryImportFromClipboard()}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      searchBarPlaceholder="Searching entries"
      onSearchTextChange={(txt) => setSearchQuery(txt)}
      actions={
        <ActionPanel title="Actions">
          <CreateDictionaryEntryAction onCreate={handleCreate} />
          {bulkActions}
        </ActionPanel>
      }
    >
      <List.Section title="Results" subtitle={displayEntries?.length + ""}>
        {(displayEntries || []).map((searchResult) => {
          return (
            <SearchListItem
              key={searchResult.id}
              searchResult={searchResult!}
              handleCreate={handleCreate}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              bulkActions={bulkActions}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  handleCreate,
  handleEdit,
  handleDelete,
  bulkActions,
}: {
  searchResult: DictionaryEntry;
  handleCreate: (entry: DictionaryEntry) => void;
  handleEdit: (entry: DictionaryEntry) => void;
  handleDelete: (entry: DictionaryEntry) => void;
  bulkActions: ReactNode;
}) {
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.description}
      accessories={searchResult.score ? [{ text: (1 - searchResult.score).toFixed(2) }] : []}
      actions={
        <ActionPanel title="Actions">
          <CreateDictionaryEntryAction onCreate={handleCreate} />
          <EditDictionaryEntryAction onEdit={handleEdit} toEdit={{ ...searchResult, score: undefined }} />
          <DeleteDictionaryEntryAction onDelete={handleDelete} toDelete={searchResult} />
          <Action
            title="Copy Description"
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            icon={Icon.Clipboard}
            onAction={() => {
              Clipboard.copy(searchResult.description);
              showToast({ title: "Copied Description" });
            }}
          />
          {bulkActions}
        </ActionPanel>
      }
    />
  );
}

function UpdateEntryForm(props: { toEdit: DictionaryEntry; onEdit: (entry: DictionaryEntry) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { title: string; description: string }) {
    props.onEdit({ title: values.title, description: values.description, id: props.toEdit.id });
    pop();
  }

  const [newDesc, setNewDesc] = useState(props.toEdit.description);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Entry"
            onSubmit={() => handleSubmit({ title: props.toEdit.title, description: newDesc })}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit the description" text="To edit title, delete the entry and create a new one." />
      <Form.TextField id="description" title="Description" value={newDesc} onChange={setNewDesc} />
    </Form>
  );
}

function CreateEntryForm(props: { onCreate: (entry: DictionaryEntry) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { title: string; description: string }) {
    props.onCreate({ title: values.title, description: values.description, id: createId() });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
      <Form.TextField id="description" title="Description" />
    </Form>
  );
}

function DeleteDictionaryEntryAction(props: { toDelete: DictionaryEntry; onDelete: (entry: DictionaryEntry) => void }) {
  return (
    <Action
      icon={Icon.Trash}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      title="Delete Entry"
      onAction={() => props.onDelete(props.toDelete)}
    />
  );
}

function EditDictionaryEntryAction(props: { toEdit: DictionaryEntry; onEdit: (entry: DictionaryEntry) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Entry"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<UpdateEntryForm onEdit={props.onEdit} toEdit={props.toEdit} />}
    />
  );
}

function CreateDictionaryEntryAction(props: { onCreate: (entry: DictionaryEntry) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Entry"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateEntryForm onCreate={props.onCreate} />}
    />
  );
}
