import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Detail,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getJournalEntries, deleteJournalEntry } from "./utils/storage";
import { exportMeditations } from "./utils/export";
import type { JournalEntry } from "./types";
import JournalCommand from "./journal";

function EmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Document}
      title="No Meditations Yet"
      description="Your journal entries will appear here. Start writing to begin your journey."
      actions={
        <ActionPanel>
          <Action.Push title="Start Journaling" target={<JournalCommand />} icon={Icon.Pencil} />
        </ActionPanel>
      }
    />
  );
}

function MeditationDetail({ meditation }: { meditation: JournalEntry }) {
  const { pop } = useNavigation();

  async function handleDelete() {
    const options: Alert.Options = {
      title: "Delete Meditation",
      message: "Are you sure? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await deleteJournalEntry(meditation.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Meditation Deleted",
          message: "Entry has been removed",
        });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message: String(error),
        });
      }
    }
  }

  return (
    <Detail
      markdown={`# ${new Date(meditation.date).toLocaleDateString()}

*${meditation.prompt}*

${meditation.content}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Date" text={new Date(meditation.date).toLocaleDateString()} />
          <Detail.Metadata.Label title="Time" text={new Date(meditation.date).toLocaleTimeString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Context">
            <Detail.Metadata.TagList.Item text="Meditation" color={"#FF6363"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Meditation"
              content={meditation.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Delete Meditation"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={handleDelete}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const journalEntries = await getJournalEntries();
      setEntries(journalEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Entries",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchText.toLowerCase();
    return (
      entry.content.toLowerCase().includes(searchLower) ||
      entry.prompt.toLowerCase().includes(searchLower) ||
      new Date(entry.date).toLocaleDateString().toLowerCase().includes(searchLower)
    );
  });

  async function handleExport() {
    try {
      const path = await exportMeditations("markdown");
      await showToast({
        style: Toast.Style.Success,
        title: "Export Successful",
        message: `Saved to ${path}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  }

  async function handleDelete(entryId: string) {
    const options: Alert.Options = {
      title: "Delete Meditation",
      message: "Are you sure? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await deleteJournalEntry(entryId);
        await showToast({
          style: Toast.Style.Success,
          title: "Meditation Deleted",
          message: "Entry has been removed",
        });
        await loadEntries(); // Refresh the list
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message: String(error),
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your meditations..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      <List.Section title="Your Meditations" subtitle={`${filteredEntries.length} entries`}>
        {filteredEntries.length === 0 && !isLoading ? (
          <EmptyView />
        ) : (
          filteredEntries.map((entry) => (
            <List.Item
              key={entry.id}
              title={new Date(entry.date).toLocaleDateString()}
              subtitle={entry.content.slice(0, 50) + (entry.content.length > 50 ? "..." : "")}
              accessories={[
                {
                  text: new Date(entry.date).toLocaleTimeString(),
                  tooltip: "Time of entry",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={entry.content}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Date" text={new Date(entry.date).toLocaleDateString()} />
                      <List.Item.Detail.Metadata.Label title="Prompt" text={entry.prompt} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Meditation"
                      target={<MeditationDetail meditation={entry} />}
                      icon={Icon.Eye}
                    />
                    <Action.CopyToClipboard
                      title="Copy Meditation"
                      content={entry.content}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Export All Meditations"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      onAction={handleExport}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Meditation"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(entry.id)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
