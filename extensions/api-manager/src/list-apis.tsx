import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ApiForm } from "./components/ApiForm";
import { deleteEntry, loadEntries } from "./storage";
import { ApiEntry, ExpiryStatus, getExpiryStatus } from "./types";
import {
  buildDetailMarkdown,
  expiryStatusColor,
  expiryStatusLabel,
  maskKey,
} from "./utils";

type FilterStatus = "all" | ExpiryStatus;

export default function ListApis() {
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showingDetail, setShowingDetail] = useState(true);
  const { push } = useNavigation();

  async function load() {
    setIsLoading(true);
    const data = await loadEntries();
    setEntries(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = entries.filter((e) => {
    if (filterStatus === "all") return true;
    return getExpiryStatus(e) === filterStatus;
  });

  async function handleDelete(entry: ApiEntry) {
    const confirmed = await confirmAlert({
      title: `Delete "${entry.name}"?`,
      message: "This action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteEntry(entry.id);
    await showToast({ style: Toast.Style.Success, title: "API key deleted" });
    await load();
  }

  function handleEdit(entry: ApiEntry) {
    push(<ApiForm entry={entry} onSave={load} />);
  }

  function handleAdd() {
    push(<ApiForm onSave={load} />);
  }

  const grouped = groupByProvider(filtered);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search by name, provider, or tag..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          onChange={(v) => setFilterStatus(v as FilterStatus)}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.Circle} />
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={{ source: Icon.Circle, tintColor: Color.Green }}
          />
          <List.Dropdown.Item
            title="Expiring Soon"
            value="expiring-soon"
            icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
          />
          <List.Dropdown.Item
            title="Expired"
            value="expired"
            icon={{ source: Icon.Circle, tintColor: Color.Red }}
          />
          <List.Dropdown.Item
            title="No Expiry"
            value="no-expiry"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Add Api Key"
            icon={Icon.Plus}
            onAction={handleAdd}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Key}
          title="No API Keys"
          description="Press ⌘N to add your first API key"
          actions={
            <ActionPanel>
              <Action
                title="Add Api Key"
                icon={Icon.Plus}
                onAction={handleAdd}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      )}

      {Object.entries(grouped).map(([provider, items]) => (
        <List.Section
          key={provider}
          title={provider}
          subtitle={`${items.length} key${items.length !== 1 ? "s" : ""}`}
        >
          {items.map((entry) => (
            <ApiListItem
              key={entry.id}
              entry={entry}
              showingDetail={showingDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onToggleDetail={() => setShowingDetail((v) => !v)}
              onRefresh={load}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ApiListItem({
  entry,
  showingDetail,
  onEdit,
  onDelete,
  onAdd,
  onToggleDetail,
  onRefresh,
}: {
  entry: ApiEntry;
  showingDetail: boolean;
  onEdit: (e: ApiEntry) => void;
  onDelete: (e: ApiEntry) => void;
  onAdd: () => void;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const status = getExpiryStatus(entry);

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: expiryStatusLabel(status, entry),
        color: expiryStatusColor(status),
      },
      tooltip: "Expiry status",
    },
  ];

  if (entry.tags.length > 0) {
    accessories.unshift({
      text: entry.tags.slice(0, 2).join(", "),
      tooltip: entry.tags.join(", "),
    });
  }

  return (
    <List.Item
      id={entry.id}
      title={entry.name}
      subtitle={!showingDetail ? maskKey(entry.key) : undefined}
      icon={Icon.Key}
      keywords={[entry.provider ?? "", ...entry.tags].filter(Boolean)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(entry)}
          metadata={
            <List.Item.Detail.Metadata>
              {entry.provider && (
                <List.Item.Detail.Metadata.Label
                  title="Provider"
                  text={entry.provider}
                  icon={Icon.Building}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={expiryStatusLabel(status, entry)}
                icon={{
                  source: Icon.Circle,
                  tintColor: expiryStatusColor(status),
                }}
              />
              {entry.expiresAt && (
                <List.Item.Detail.Metadata.Label
                  title="Expires"
                  text={entry.expiresAt}
                />
              )}
              {entry.tags.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {entry.tags.map((tag) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={tag}
                        text={tag}
                        color={Color.Blue}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </>
              )}
              {entry.url && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="URL"
                    text={entry.url}
                    target={entry.url}
                  />
                </>
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Added"
                text={new Date(entry.createdAt).toLocaleDateString()}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={new Date(entry.updatedAt).toLocaleDateString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Key">
            <Action.CopyToClipboard
              title="Copy Api Key"
              content={entry.key}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              concealed
            />
            <Action.CopyToClipboard
              title="Copy Key Name"
              content={entry.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {entry.url && (
              <Action.OpenInBrowser
                title="Open URL"
                url={entry.url}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Edit"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => onEdit(entry)}
            />
            <Action
              title="Add Api Key"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={onAdd}
            />
            <Action
              title="Toggle Detail Panel"
              icon={Icon.AppWindowSidebarLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(entry)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function groupByProvider(entries: ApiEntry[]): Record<string, ApiEntry[]> {
  const map: Record<string, ApiEntry[]> = {};
  for (const entry of entries) {
    const key = entry.provider || "Other";
    if (!map[key]) map[key] = [];
    map[key].push(entry);
  }
  return map;
}
