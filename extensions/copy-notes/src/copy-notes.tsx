import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  Icon,
  useNavigation,
  Form,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";

const BUCKET_COUNT = 5;
const STORAGE_KEY = "copy-notes-buckets";
const HISTORY_KEY = "copy-notes-history";

async function loadHistory(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function saveHistory(history: string[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

interface Bucket {
  id: number;
  name: string;
  items: string[];
}

function defaultBuckets(): Bucket[] {
  return Array.from({ length: BUCKET_COUNT }, (_, i) => ({ id: i, name: "", items: [] }));
}

async function loadBuckets(): Promise<Bucket[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return defaultBuckets();
  const parsed = JSON.parse(stored) as Bucket[];
  while (parsed.length < BUCKET_COUNT) parsed.push({ id: parsed.length, name: "", items: [] });
  return parsed.slice(0, BUCKET_COUNT);
}

async function saveBuckets(buckets: Bucket[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(buckets));
}

function truncate(text: string, max = 60): string {
  const single = text.replace(/\n/g, " ").trim();
  return single.length <= max ? single : single.substring(0, max) + "...";
}

function bucketMarkdown(bucket: Bucket): string {
  if (bucket.items.length === 0) return "_Empty_";
  return bucket.items.map((item, i) => `**${i + 1}.** ${item.replace(/\n/g, " ").trim()}`).join("\n\n");
}

function BucketNameForm({ initialName, onSubmit }: { initialName?: string; onSubmit: (name: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={initialName ? "Rename Bucket" : "Name Your Bucket"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={initialName ? "Rename" : "Create Bucket"}
            onSubmit={(values: { name: string }) => {
              if (values.name.trim()) {
                onSubmit(values.name.trim());
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Bucket Name"
        placeholder="e.g. Work, Personal, Links..."
        defaultValue={initialName}
        autoFocus
      />
    </Form>
  );
}

function BucketItemsView({
  bucket,
  onRemove,
  onDelete,
}: {
  bucket: Bucket;
  onRemove: (text: string) => void;
  onDelete: (text: string) => void;
}) {
  const [items, setItems] = useState<string[]>(bucket.items);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  function toggleSelection(text: string) {
    setSelected((prev) => (prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]));
  }

  function enterSelectionMode(text: string) {
    setSelectionMode(true);
    setSelected([text]);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected([]);
  }

  async function pasteSelected() {
    const joined = selected.join("\n");
    await Clipboard.paste(joined);
    setSelected([]);
    setSelectionMode(false);
    await showToast({ style: Toast.Style.Success, title: `Pasted ${selected.length} items` });
  }

  function handleRemove(text: string) {
    setItems((prev) => prev.filter((i) => i !== text));
    setSelected((prev) => prev.filter((i) => i !== text));
    onRemove(text);
  }

  function handleDelete(text: string) {
    setItems((prev) => prev.filter((i) => i !== text));
    setSelected((prev) => prev.filter((i) => i !== text));
    onDelete(text);
  }

  return (
    <List
      navigationTitle={bucket.name}
      searchBarPlaceholder={selectionMode ? `Selection mode — ${selected.length} selected` : "Type a number to jump..."}
    >
      {items.map((text, i) => {
        const isSelected = selected.includes(text);
        const selectionIndex = selected.indexOf(text);

        const copyAndDeleteActions = (
          <>
            <Action
              title="Copy"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(text);
                await showToast({ style: Toast.Style.Success, title: "Copied" });
              }}
            />
            <Action title="Remove from Bucket" icon={Icon.MinusCircle} onAction={() => handleRemove(text)} />
            <Action
              title="Delete Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => handleDelete(text)}
            />
          </>
        );

        return (
          <List.Item
            key={i}
            icon={isSelected ? Icon.CheckCircle : Icon.Clipboard}
            title={`${i + 1}. ${text.replace(/\n/g, " ").trim()}`}
            keywords={[String(i + 1)]}
            accessories={isSelected ? [{ tag: String(selectionIndex + 1) }] : []}
            actions={
              selectionMode ? (
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => toggleSelection(text)}
                  />
                  <Action title={`Paste ${selected.length} Selected`} icon={Icon.Clipboard} onAction={pasteSelected} />
                  <Action
                    title="Exit Selection Mode"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["ctrl"], key: "escape" }}
                    onAction={exitSelectionMode}
                  />
                  {copyAndDeleteActions}
                </ActionPanel>
              ) : (
                <ActionPanel>
                  <Action
                    title="Paste"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.paste(text);
                      await showToast({ style: Toast.Style.Success, title: "Pasted" });
                    }}
                  />
                  <Action title="Select" icon={Icon.Circle} onAction={() => enterSelectionMode(text)} />
                  {copyAndDeleteActions}
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const [uncategorized, setUncategorized] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>(defaultBuckets());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const { push } = useNavigation();

  function toggleSelection(text: string) {
    setSelectedItems((prev) => (prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]));
  }

  function enterSelectionMode(text: string) {
    setSelectionMode(true);
    setSelectedItems([text]);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedItems([]);
  }

  async function init() {
    setIsLoading(true);

    // Read fresh items from clipboard (API capped at ~5)
    const fresh: string[] = [];
    for (let offset = 0; offset < 10; offset++) {
      try {
        const { text } = await Clipboard.read({ offset });
        const trimmed = text?.trim();
        if (trimmed) fresh.push(trimmed);
      } catch {
        break;
      }
    }

    // Merge fresh items with persisted history — fresh items go to the front
    const persisted = await loadHistory();
    const merged = [...fresh];
    for (const item of persisted) {
      if (!merged.includes(item)) merged.push(item);
    }

    // Persist the merged history
    await saveHistory(merged);

    const storedBuckets = await loadBuckets();
    const bucketed = new Set(storedBuckets.flatMap((b) => b.items));
    setUncategorized(merged.filter((t) => !bucketed.has(t)));
    setBuckets(storedBuckets);
    setIsLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  async function moveToExistingBucket(text: string, bucketId: number) {
    const updated = buckets.map((b) =>
      b.id === bucketId ? { ...b, items: [text, ...b.items.filter((i) => i !== text)] } : b,
    );
    setBuckets(updated);
    setUncategorized((prev) => prev.filter((i) => i !== text));
    const persisted = await loadHistory();
    await saveHistory(persisted.filter((i) => i !== text));
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: `Moved to "${updated[bucketId].name}"` });
  }

  async function moveToNewBucket(text: string, bucketId: number, name: string) {
    const updated = buckets.map((b) =>
      b.id === bucketId ? { ...b, name, items: [text, ...b.items.filter((i) => i !== text)] } : b,
    );
    setBuckets(updated);
    setUncategorized((prev) => prev.filter((i) => i !== text));
    const persisted = await loadHistory();
    await saveHistory(persisted.filter((i) => i !== text));
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: `Created "${name}" and added item` });
  }

  async function renameBucket(bucketId: number, name: string) {
    const updated = buckets.map((b) => (b.id === bucketId ? { ...b, name } : b));
    setBuckets(updated);
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: `Renamed to "${name}"` });
  }

  async function moveBulkToExistingBucket(bucketId: number) {
    const texts = [...selectedItems];
    const updated = buckets.map((b) =>
      b.id === bucketId ? { ...b, items: [...texts, ...b.items.filter((i) => !selectedItems.includes(i))] } : b,
    );
    setBuckets(updated);
    setUncategorized((prev) => prev.filter((i) => !selectedItems.includes(i)));
    setSelectedItems([]);
    await saveBuckets(updated);
    await showToast({
      style: Toast.Style.Success,
      title: `Moved ${texts.length} items to "${updated[bucketId].name}"`,
    });
  }

  async function moveBulkToNewBucket(bucketId: number, name: string) {
    const texts = [...selectedItems];
    const updated = buckets.map((b) =>
      b.id === bucketId ? { ...b, name, items: [...texts, ...b.items.filter((i) => !selectedItems.includes(i))] } : b,
    );
    setBuckets(updated);
    setUncategorized((prev) => prev.filter((i) => !selectedItems.includes(i)));
    setSelectedItems([]);
    await saveBuckets(updated);
    await showToast({
      style: Toast.Style.Success,
      title: `Moved ${texts.length} items to "${name}"`,
    });
  }

  async function removeFromBucket(text: string, bucketId: number) {
    const updated = buckets.map((b) => (b.id === bucketId ? { ...b, items: b.items.filter((i) => i !== text) } : b));
    setBuckets(updated);
    setUncategorized((prev) => [text, ...prev]);
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: "Moved back to Recent" });
  }

  async function deleteEntry(text: string) {
    const confirmed = await confirmAlert({
      title: "Delete Entry",
      message: truncate(text, 80),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    setUncategorized((prev) => prev.filter((i) => i !== text));
    const persisted = await loadHistory();
    await saveHistory(persisted.filter((i) => i !== text));
    await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
  }

  async function deleteBucket(bucketId: number) {
    const bucket = buckets.find((b) => b.id === bucketId);
    const confirmed = await confirmAlert({
      title: `Delete "${bucket?.name}" Bucket`,
      message: `This will permanently delete the bucket and all ${bucket?.items.length} item${bucket?.items.length !== 1 ? "s" : ""} inside it.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const updated = buckets.map((b) => (b.id === bucketId ? { ...b, name: "", items: [] } : b));
    setBuckets(updated);
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: `"${bucket?.name}" deleted` });
  }

  async function deleteEntryFromBucket(text: string, bucketId: number) {
    const updated = buckets.map((b) => (b.id === bucketId ? { ...b, items: b.items.filter((i) => i !== text) } : b));
    setBuckets(updated);
    const persisted = await loadHistory();
    await saveHistory(persisted.filter((i) => i !== text));
    await saveBuckets(updated);
    await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
  }

  function openBucket(bucket: Bucket) {
    push(
      <BucketItemsView
        bucket={bucket}
        onRemove={(text) => removeFromBucket(text, bucket.id)}
        onDelete={(text) => deleteEntryFromBucket(text, bucket.id)}
      />,
    );
  }

  function getMoveActions(text: string) {
    const namedBuckets = buckets.filter((b) => b.name);
    const nextEmptyBucket = buckets.find((b) => !b.name);

    return [
      ...namedBuckets.map((bucket) => (
        <Action
          key={bucket.id}
          title={bucket.name}
          icon={Icon.Folder}
          onAction={() => moveToExistingBucket(text, bucket.id)}
        />
      )),
      nextEmptyBucket ? (
        <Action
          key="new"
          title="New Bucket"
          icon={Icon.FolderAdd}
          onAction={() => push(<BucketNameForm onSubmit={(name) => moveToNewBucket(text, nextEmptyBucket.id, name)} />)}
        />
      ) : null,
    ];
  }

  function getBulkMoveActions() {
    const namedBuckets = buckets.filter((b) => b.name);
    const nextEmptyBucket = buckets.find((b) => !b.name);
    return [
      ...namedBuckets.map((bucket) => (
        <Action
          key={bucket.id}
          title={bucket.name}
          icon={Icon.Folder}
          onAction={() => moveBulkToExistingBucket(bucket.id)}
        />
      )),
      nextEmptyBucket ? (
        <Action
          key="new"
          title="New Bucket"
          icon={Icon.FolderAdd}
          onAction={() => push(<BucketNameForm onSubmit={(name) => moveBulkToNewBucket(nextEmptyBucket.id, name)} />)}
        />
      ) : null,
    ];
  }

  async function pasteSelected() {
    const joined = selectedItems.join("\n");
    await Clipboard.paste(joined);
    setSelectedItems([]);
    await showToast({
      style: Toast.Style.Success,
      title: `Pasted ${selectedItems.length} items`,
    });
  }

  function clipboardItemActions(text: string) {
    const isSelected = selectedItems.includes(text);
    const moveBucketSubmenu =
      selectedItems.length > 0 ? (
        <ActionPanel.Submenu
          title={`Move ${selectedItems.length} Selected to Bucket`}
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
        >
          {getBulkMoveActions()}
        </ActionPanel.Submenu>
      ) : (
        <ActionPanel.Submenu
          title="Move to Bucket"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
        >
          {getMoveActions(text)}
        </ActionPanel.Submenu>
      );

    const copyAndDeleteActions = (
      <>
        <Action
          title="Copy"
          icon={Icon.CopyClipboard}
          onAction={async () => {
            await Clipboard.copy(text);
            await showToast({ style: Toast.Style.Success, title: "Copied" });
          }}
        />
        <Action
          title="Delete Entry"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={() => deleteEntry(text)}
        />
      </>
    );

    if (selectionMode) {
      return (
        <ActionPanel>
          <Action
            title={isSelected ? "Deselect" : "Select"}
            icon={isSelected ? Icon.CheckCircle : Icon.Circle}
            onAction={() => toggleSelection(text)}
          />
          <Action title={`Paste ${selectedItems.length} Selected`} icon={Icon.Clipboard} onAction={pasteSelected} />
          {moveBucketSubmenu}
          <Action
            title="Exit Selection Mode"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["ctrl"], key: "escape" }}
            onAction={exitSelectionMode}
          />
          {copyAndDeleteActions}
        </ActionPanel>
      );
    }

    return (
      <ActionPanel>
        <Action
          title="Paste"
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.paste(text);
            await showToast({ style: Toast.Style.Success, title: "Pasted" });
          }}
        />
        <Action title="Select" icon={Icon.Circle} onAction={() => enterSelectionMode(text)} />
        {moveBucketSubmenu}
        {copyAndDeleteActions}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={selectionMode ? `Selection mode — ${selectedItems.length} selected` : "Search..."}
      isShowingDetail
    >
      <List.Section title="Latest Copied">
        {uncategorized.length === 0 && !isLoading && (
          <List.Item id="empty-recent" title="No uncategorized items" icon={Icon.CheckCircle} />
        )}
        {uncategorized.slice(0, 1).map((text, i) => (
          <List.Item
            key={`uncategorized-${i}`}
            id={`uncategorized-${i}`}
            icon={selectedItems.includes(text) ? Icon.CheckCircle : Icon.Clipboard}
            title={truncate(text)}
            accessories={selectedItems.includes(text) ? [{ tag: String(selectedItems.indexOf(text) + 1) }] : []}
            detail={<List.Item.Detail markdown={text} />}
            actions={clipboardItemActions(text)}
          />
        ))}
      </List.Section>

      <List.Section title="Buckets">
        {buckets
          .filter((b) => b.items.length > 0)
          .map((bucket) => (
            <List.Item
              key={`bucket-${bucket.id}`}
              id={`bucket-${bucket.id}`}
              icon={Icon.Folder}
              title={bucket.name}
              subtitle={`${bucket.items.length} item${bucket.items.length !== 1 ? "s" : ""}`}
              keywords={bucket.items.map((t) => t.replace(/\n/g, " ").trim())}
              detail={<List.Item.Detail markdown={bucketMarkdown(bucket)} />}
              actions={
                <ActionPanel>
                  <Action title="Open Bucket" icon={Icon.ArrowRight} onAction={() => openBucket(bucket)} />
                  <Action
                    title="Rename Bucket"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(
                        <BucketNameForm initialName={bucket.name} onSubmit={(name) => renameBucket(bucket.id, name)} />,
                      )
                    }
                  />
                  <Action
                    title="Delete Bucket"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteBucket(bucket.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      {uncategorized.length > 1 && (
        <List.Section title="Everything Else">
          {uncategorized.slice(1).map((text, i) => (
            <List.Item
              key={`older-${i}`}
              id={`older-${i}`}
              icon={selectedItems.includes(text) ? Icon.CheckCircle : Icon.Clipboard}
              title={truncate(text)}
              subtitle={`${i + 1} ago`}
              accessories={selectedItems.includes(text) ? [{ tag: String(selectedItems.indexOf(text) + 1) }] : []}
              detail={<List.Item.Detail markdown={text} />}
              actions={clipboardItemActions(text)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
