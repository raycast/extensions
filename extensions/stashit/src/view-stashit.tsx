import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showHUD,
  Clipboard,
  Form,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getSortedQueue,
  removeItem,
  popItem,
  popItemById,
  popHighestFromAnyQueue,
  getArchive,
  restoreItem,
  clearArchive,
  deleteQueueByName,
  updateItem,
  QueueItem,
  backupToFile,
  restoreFromFile,
  getSettings,
  saveSettings,
  moveItem,
} from "./utils/queue";

type ViewFilter = "active" | "history" | "all";

function EditItemForm({
  item,
  onSave,
}: {
  item: QueueItem;
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [text, setText] = useState(item.text);
  const [priority, setPriority] = useState(item.priority.toString());
  const [queue, setQueue] = useState(item.queue);

  async function handleSubmit() {
    await updateItem(item.id, {
      text: text.trim(),
      priority: parseInt(priority, 10) || 0,
      queue: queue.trim().toLowerCase() || "default",
    });
    await showHUD("✅ Item updated");
    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Task" value={text} onChange={setText} />
      <Form.TextField
        id="priority"
        title="Priority"
        value={priority}
        onChange={setPriority}
      />
      <Form.TextField
        id="queue"
        title="Queue"
        value={queue}
        onChange={setQueue}
      />
    </Form>
  );
}

function SettingsForm({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();
  const [retentionDays, setRetentionDays] = useState("15");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings();
      setRetentionDays(settings.retentionDays.toString());
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSubmit() {
    const days = parseInt(retentionDays, 10);
    if (isNaN(days) || days < 1) {
      await showHUD("❌ Retention days must be at least 1");
      return;
    }
    await saveSettings({ retentionDays: days });
    await showHUD(`✅ History retention set to ${days} days`);
    onSave();
    pop();
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="retentionDays"
        title="History Retention (days)"
        value={retentionDays}
        onChange={setRetentionDays}
        info="Popped items older than this will be automatically deleted"
      />
      <Form.Description
        title="Note"
        text="Set to 0 to keep history forever. Default is 15 days."
      />
    </Form>
  );
}

export default function Command() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [archive, setArchive] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("active");

  async function loadQueue() {
    setIsLoading(true);
    const queue = await getSortedQueue();
    const archived = await getArchive();
    setItems(queue);
    setArchive(archived);
    setIsLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function handlePopFromQueue(queueName: string) {
    const item = await popItem(queueName);
    if (item) {
      await Clipboard.copy(item.text);
      await showHUD(`📋 Popped: "${item.text}" from ${queueName}`);
    }
    await loadQueue();
  }

  async function handlePopHighest() {
    const item = await popHighestFromAnyQueue();
    if (item) {
      await Clipboard.copy(item.text);
      await showHUD(`📋 Popped: "${item.text}" from ${item.queue}`);
    }
    await loadQueue();
  }

  async function handleRemove(id: string) {
    await removeItem(id);
    await loadQueue();
  }

  async function handlePopById(id: string) {
    const item = await popItemById(id);
    if (item) {
      await Clipboard.copy(item.text);
      await showHUD(`📋 Popped: "${item.text}"`);
    }
    await loadQueue();
  }

  async function handleCopy(text: string) {
    await Clipboard.copy(text);
    await showHUD("📋 Copied to clipboard");
  }

  async function handleRestore(id: string) {
    await restoreItem(id);
    await showHUD("♻️ Restored to queue");
    await loadQueue();
  }

  async function handleClearArchive() {
    await clearArchive();
    await showHUD("🗑️ Archive cleared");
    await loadQueue();
  }

  async function handleDeleteQueue(queueName: string) {
    const count = await deleteQueueByName(queueName);
    await showHUD(
      `🗑️ Deleted ${count} item${count !== 1 ? "s" : ""} from ${queueName}`,
    );
    await loadQueue();
  }

  function cycleFilter() {
    const filters: ViewFilter[] = ["active", "history", "all"];
    const currentIndex = filters.indexOf(viewFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setViewFilter(filters[nextIndex]);
  }

  function generateExportData() {
    return {
      exportedAt: new Date().toISOString(),
      active: items,
      history: archive,
    };
  }

  function generateMarkdownExport(): string {
    const lines: string[] = [];
    lines.push("# Stashit Export");
    lines.push(`\n*Exported: ${new Date().toLocaleString()}*\n`);

    if (items.length > 0) {
      lines.push("## Active Queue\n");
      const grouped: Record<string, QueueItem[]> = {};
      items.forEach((item) => {
        if (!grouped[item.queue]) grouped[item.queue] = [];
        grouped[item.queue].push(item);
      });

      Object.entries(grouped).forEach(([queueName, queueItems]) => {
        lines.push(`### ${queueName}\n`);
        lines.push("| Priority | Task | Added |");
        lines.push("|----------|------|-------|");
        queueItems.forEach((item) => {
          const date = new Date(item.createdAt).toLocaleDateString();
          lines.push(`| ${item.priority} | ${item.text} | ${date} |`);
        });
        lines.push("");
      });
    }

    if (archive.length > 0) {
      lines.push("## History\n");
      lines.push("| Priority | Task | Queue | Added |");
      lines.push("|----------|------|-------|-------|");
      archive.forEach((item) => {
        const date = new Date(item.createdAt).toLocaleDateString();
        lines.push(
          `| ${item.priority} | ${item.text} | ${item.queue} | ${date} |`,
        );
      });
    }

    return lines.join("\n");
  }

  async function handleExportJSON() {
    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    await Clipboard.copy(json);
    await showHUD(`📋 Exported ${items.length + archive.length} items as JSON`);
  }

  async function handleExportMarkdown() {
    const markdown = generateMarkdownExport();
    await Clipboard.copy(markdown);
    await showHUD(
      `📋 Exported ${items.length + archive.length} items as Markdown`,
    );
  }

  async function handleBackupToFile() {
    const path = await backupToFile();
    await Clipboard.copy(path);
    await showHUD(`💾 Backed up to ${path} (path copied)`);
  }

  async function handleRestoreFromFile() {
    const result = await restoreFromFile();
    if (result) {
      await showHUD(
        `♻️ Restored ${result.activeCount} active + ${result.archiveCount} archived items`,
      );
      await loadQueue();
    } else {
      await showHUD("❌ No backup file found");
    }
  }

  async function handleMoveUp(id: string) {
    const moved = await moveItem(id, "up");
    if (moved) {
      await loadQueue();
    }
  }

  async function handleMoveDown(id: string) {
    const moved = await moveItem(id, "down");
    if (moved) {
      await loadQueue();
    }
  }

  function getPriorityColor(priority: number): Color {
    if (priority >= 8) return Color.Red;
    if (priority >= 5) return Color.Orange;
    if (priority >= 3) return Color.Yellow;
    if (priority > 0) return Color.Green;
    return Color.SecondaryText;
  }

  function getPriorityLabel(priority: number): string {
    if (priority >= 8) return "🔴 Critical";
    if (priority >= 5) return "🟠 High";
    if (priority >= 3) return "🟡 Medium";
    if (priority > 0) return "🟢 Low";
    return "➖ None";
  }

  function formatFullDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function getItemDetail(item: QueueItem, isArchived: boolean = false): string {
    return `
# ${item.text}

---

| Property | Value |
|----------|-------|
| **Queue** | ${item.queue} |
| **Priority** | ${item.priority} — ${getPriorityLabel(item.priority)} |
| **Added** | ${formatFullDate(item.createdAt)} |
${isArchived && item.poppedAt ? `| **Popped** | ${formatFullDate(item.poppedAt)} |` : ""}

---

${isArchived ? "*This item has been completed*" : "*Press Enter to pop this item*"}
`;
  }

  // Group items by queue
  const itemsByQueue = items.reduce(
    (acc, item) => {
      if (!acc[item.queue]) {
        acc[item.queue] = [];
      }
      acc[item.queue].push(item);
      return acc;
    },
    {} as Record<string, QueueItem[]>,
  );

  const queueNames = Object.keys(itemsByQueue).sort();

  const showActive = viewFilter === "active" || viewFilter === "all";
  const showHistory = viewFilter === "history" || viewFilter === "all";

  const isEmpty =
    (showActive && items.length === 0 && !showHistory) ||
    (showHistory && archive.length === 0 && !showActive) ||
    (items.length === 0 && archive.length === 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter queue items..."
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter View"
          value={viewFilter}
          onChange={(value) => setViewFilter(value as ViewFilter)}
        >
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={Icon.Circle}
          />
          <List.Dropdown.Item
            title="History"
            value="history"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {isEmpty && !isLoading ? (
        <List.EmptyView
          icon={viewFilter === "history" ? Icon.CheckCircle : Icon.Tray}
          title={viewFilter === "history" ? "No History" : "Queue is Empty"}
          description={
            viewFilter === "history"
              ? "Pop items to see them here"
              : "Add items using 'Add to Queue' command"
          }
        />
      ) : (
        <>
          {showActive &&
            queueNames.map((queueName) => {
              const queueItems = itemsByQueue[queueName];
              return (
                <List.Section
                  key={queueName}
                  title={queueName}
                  subtitle={`${queueItems.length} item${queueItems.length !== 1 ? "s" : ""}`}
                >
                  {queueItems.map((item, index) => (
                    <List.Item
                      key={item.id}
                      icon={
                        index === 0
                          ? { source: Icon.ArrowUp, tintColor: Color.Green }
                          : Icon.Dot
                      }
                      title={item.text}
                      keywords={[
                        item.queue,
                        `#${item.priority}`,
                        `priority ${item.priority}`,
                      ]}
                      accessories={[
                        {
                          tag: {
                            value: `#${item.priority}`,
                            color: getPriorityColor(item.priority),
                          },
                        },
                      ]}
                      detail={
                        <List.Item.Detail markdown={getItemDetail(item)} />
                      }
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section>
                            <Action
                              title="Pop This Item"
                              icon={Icon.ArrowUp}
                              onAction={() => handlePopById(item.id)}
                            />
                            <Action
                              title="Copy to Clipboard"
                              icon={Icon.Clipboard}
                              shortcut={{ modifiers: ["cmd"], key: "c" }}
                              onAction={() => handleCopy(item.text)}
                            />
                            <Action.Push
                              title="Edit Item"
                              icon={Icon.Pencil}
                              shortcut={Keyboard.Shortcut.Common.Edit}
                              target={
                                <EditItemForm item={item} onSave={loadQueue} />
                              }
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Reorder">
                            <Action
                              title="Move up"
                              icon={Icon.ChevronUp}
                              shortcut={{
                                modifiers: ["shift"],
                                key: "arrowUp",
                              }}
                              onAction={() => handleMoveUp(item.id)}
                            />
                            <Action
                              title="Move Down"
                              icon={Icon.ChevronDown}
                              shortcut={{
                                modifiers: ["shift"],
                                key: "arrowDown",
                              }}
                              onAction={() => handleMoveDown(item.id)}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section>
                            <Action
                              title={`Pop from ${queueName}`}
                              icon={Icon.Bolt}
                              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                              onAction={() => handlePopFromQueue(queueName)}
                            />
                            <Action
                              title="Pop Highest (Any Queue)"
                              icon={Icon.Bolt}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "p",
                              }}
                              onAction={handlePopHighest}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section>
                            <Action
                              title="Toggle Detail"
                              icon={Icon.Sidebar}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                              onAction={() => setShowDetail(!showDetail)}
                            />
                            <Action
                              title="Cycle View Filter"
                              icon={Icon.Filter}
                              shortcut={{ modifiers: ["cmd"], key: "f" }}
                              onAction={cycleFilter}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Export & Backup">
                            <Action
                              title="Export All as JSON"
                              icon={Icon.Download}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "j",
                              }}
                              onAction={handleExportJSON}
                            />
                            <Action
                              title="Export All as Markdown"
                              icon={Icon.Document}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "m",
                              }}
                              onAction={handleExportMarkdown}
                            />
                            <Action
                              title="Backup to File"
                              icon={Icon.HardDrive}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "b",
                              }}
                              onAction={handleBackupToFile}
                            />
                            <Action
                              title="Restore from Backup"
                              icon={Icon.RotateAntiClockwise}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "r",
                              }}
                              onAction={handleRestoreFromFile}
                            />
                            <Action.Push
                              title="Settings"
                              icon={Icon.Gear}
                              shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
                              target={<SettingsForm onSave={loadQueue} />}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section>
                            <Action
                              title="Remove from Queue"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={{ modifiers: ["ctrl"], key: "x" }}
                              onAction={() => handleRemove(item.id)}
                            />
                            <Action
                              title={`Delete All in ${queueName}`}
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "backspace",
                              }}
                              onAction={() => handleDeleteQueue(queueName)}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  ))}
                </List.Section>
              );
            })}

          {showHistory && archive.length > 0 && (
            <List.Section
              title="History"
              subtitle={`${archive.length} popped item${archive.length !== 1 ? "s" : ""}`}
            >
              {archive.map((item) => (
                <List.Item
                  key={item.id}
                  icon={{
                    source: Icon.CheckCircle,
                    tintColor: Color.SecondaryText,
                  }}
                  title={item.text}
                  keywords={[
                    item.queue,
                    `#${item.priority}`,
                    `priority ${item.priority}`,
                  ]}
                  accessories={[
                    {
                      tag: {
                        value: item.queue,
                        color: Color.SecondaryText,
                      },
                    },
                  ]}
                  detail={
                    <List.Item.Detail markdown={getItemDetail(item, true)} />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title="Restore to Queue"
                          icon={Icon.Undo}
                          onAction={() => handleRestore(item.id)}
                        />
                        <Action
                          title="Copy to Clipboard"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={() => handleCopy(item.text)}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Toggle Detail"
                          icon={Icon.Sidebar}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setShowDetail(!showDetail)}
                        />
                        <Action
                          title="Cycle View Filter"
                          icon={Icon.Filter}
                          shortcut={{ modifiers: ["cmd"], key: "f" }}
                          onAction={cycleFilter}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Export & Backup">
                        <Action
                          title="Export All as JSON"
                          icon={Icon.Download}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                          onAction={handleExportJSON}
                        />
                        <Action
                          title="Export All as Markdown"
                          icon={Icon.Document}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                          onAction={handleExportMarkdown}
                        />
                        <Action
                          title="Backup to File"
                          icon={Icon.HardDrive}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                          onAction={handleBackupToFile}
                        />
                        <Action
                          title="Restore from Backup"
                          icon={Icon.RotateAntiClockwise}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                          onAction={handleRestoreFromFile}
                        />
                        <Action.Push
                          title="Settings"
                          icon={Icon.Gear}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
                          target={<SettingsForm onSave={loadQueue} />}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Clear All History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={handleClearArchive}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
