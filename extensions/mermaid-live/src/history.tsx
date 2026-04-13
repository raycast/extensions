import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Detail,
  Form,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { encodeMermaid, detectDiagramType, HistoryItem } from "./utils";

export default function Command() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const items = await getHistory();
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmAlert({
      title: "Delete Diagram",
      message: "Are you sure you want to delete this diagram from history?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteHistoryItem(id);
      await loadHistory();
      showToast({
        style: Toast.Style.Success,
        title: "Deleted from history",
      });
    }
  }

  async function handleTogglePin(id: string) {
    await togglePinHistoryItem(id);
    await loadHistory();
  }

  const filteredHistory = searchText
    ? history.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()))
    : history;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search diagrams by name..."
      onSearchTextChange={setSearchText}
      navigationTitle="Mermaid History"
    >
      {filteredHistory.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No diagrams in history"
          description="Diagrams you render will appear here"
        />
      ) : (
        filteredHistory.map((item) => (
          <List.Item
            key={item.id}
            icon={item.isPinned ? { source: Icon.Pin, tintColor: Color.Yellow } : Icon.Document}
            title={item.name}
            subtitle={new Date(item.createdAt).toLocaleString("en-US")}
            accessories={[
              { text: detectDiagramType(item.code) },
              item.isPinned ? { icon: { source: Icon.Pin, tintColor: Color.Yellow } } : {},
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Diagram" icon={Icon.Eye} target={<DiagramDetailView item={item} />} />
                <Action
                  title={item.isPinned ? "Unpin" : "Pin"}
                  icon={Icon.Pin}
                  onAction={() => handleTogglePin(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.Push
                  title="Rename"
                  icon={Icon.Pencil}
                  target={<RenameForm item={item} onRename={loadHistory} />}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.CopyToClipboard
                  title="Copy Code"
                  content={item.code}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Mermaid Live"
                  url={`https://mermaid.live/edit#pako:${encodeMermaid(item.code)}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Detail view of diagram from history
function DiagramDetailView({ item }: { item: HistoryItem }) {
  const imageUrl = `https://mermaid.ink/img/pako:${encodeMermaid(item.code)}`;
  const markdown = `# ${item.name}\n\n![Diagram](${imageUrl}?raycast-width=900)`;

  // Update last accessed when diagram is opened
  useEffect(() => {
    async function updateLastAccessed() {
      const historyJson = await LocalStorage.getItem<string>("mermaid-history");
      if (!historyJson) return;
      try {
        const history: HistoryItem[] = JSON.parse(historyJson);
        const foundItem = history.find((h) => h.id === item.id);
        if (foundItem) {
          foundItem.lastAccessed = new Date().toISOString();
          await LocalStorage.setItem("mermaid-history", JSON.stringify(history));
        }
      } catch {
        // Corrupted data — skip update
      }
    }
    updateLastAccessed();
  }, [item.id]);

  const { pop } = useNavigation();

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Expand Diagram"
            icon="↕️"
            url={imageUrl}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Back to History"
            icon={Icon.ArrowLeft}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          <Action.OpenInBrowser
            title="Edit in Mermaid Live"
            url={`https://mermaid.live/edit#pako:${encodeMermaid(item.code)}`}
          />
          <Action.CopyToClipboard title="Copy Code" content={item.code} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard
            title="Copy Image URL"
            content={imageUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={item.name} />
          <Detail.Metadata.Label title="Type" text={detectDiagramType(item.code)} />
          <Detail.Metadata.Label title="Lines" text={item.code.split("\n").length.toString()} />
          <Detail.Metadata.Label title="Characters" text={item.code.length.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(item.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <Detail.Metadata.Label title="Pinned" text={item.isPinned ? "Yes" : "No"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Documentation" target="https://mermaid.js.org/" text="Mermaid Docs" />
          <Detail.Metadata.Link
            title="Live Editor"
            target={`https://mermaid.live/edit#pako:${encodeMermaid(item.code)}`}
            text="Edit Online"
          />
        </Detail.Metadata>
      }
    />
  );
}

// Form to rename
function RenameForm({ item, onRename }: { item: HistoryItem; onRename: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name cannot be empty",
      });
      return;
    }
    await renameHistoryItem(item.id, values.name.trim());
    showToast({
      style: Toast.Style.Success,
      title: "Renamed successfully",
    });
    pop();
    onRename();
  }

  return (
    <Form
      navigationTitle="Rename Diagram"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter new name" defaultValue={item.name} />
    </Form>
  );
}

// Utility Functions

async function getHistory(): Promise<HistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return [];
  try {
    const history: HistoryItem[] = JSON.parse(historyJson);
    return history.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });
  } catch {
    return [];
  }
}

async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await LocalStorage.setItem("mermaid-history", JSON.stringify(filtered));
}

async function togglePinHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const item = history.find((item) => item.id === id);
  if (item) {
    item.isPinned = !item.isPinned;
    await LocalStorage.setItem("mermaid-history", JSON.stringify(history));
  }
}

async function renameHistoryItem(id: string, newName: string): Promise<void> {
  const history = await getHistory();
  const item = history.find((item) => item.id === id);
  if (item) {
    item.name = newName;
    await LocalStorage.setItem("mermaid-history", JSON.stringify(history));
  }
}
