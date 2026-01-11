import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Recipe, UsageRecord } from "../types";
import { getUsageRecords, deleteUsageRecord, clearUsageRecords } from "../lib/storage";

interface HistoryViewProps {
  recipe: Recipe;
}

export function HistoryView({ recipe }: HistoryViewProps) {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadRecords = async () => {
    setIsLoading(true);
    const loadedRecords = await getUsageRecords(recipe.id);
    // Sort by newest first
    loadedRecords.sort((a, b) => b.createdAt - a.createdAt);
    setRecords(loadedRecords);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleDelete = async (record: UsageRecord) => {
    const confirmed = await confirmAlert({
      title: "Delete Record",
      message: "Are you sure you want to delete this history record?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteUsageRecord(record.id);
      await showToast({ style: Toast.Style.Success, title: "Record deleted" });
      loadRecords();
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: `Are you sure you want to clear all history for "${recipe.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearUsageRecords(recipe.id);
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
      loadRecords();
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <List isLoading={isLoading} navigationTitle={`${recipe.name} - History`} searchBarPlaceholder="Search history...">
      {records.length === 0 ? (
        <List.EmptyView icon={Icon.Clock} title="No History" description="Use this recipe to start building history" />
      ) : (
        <>
          <List.Section title={`${records.length} Record${records.length !== 1 ? "s" : ""}`}>
            {records.map((record) => (
              <List.Item
                key={record.id}
                title={truncateText(record.input.replace(/\n/g, " "), 60)}
                subtitle={truncateText(record.output.replace(/\n/g, " "), 40)}
                keywords={[record.input, record.output]}
                accessories={[{ text: formatDate(record.createdAt), icon: Icon.Clock }]}
                icon={Icon.Document}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() => push(<RecordDetailView record={record} recipeName={recipe.name} />)}
                    />
                    <Action
                      title="Copy Output"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(record.output);
                        await showToast({ style: Toast.Style.Success, title: "Output copied" });
                      }}
                    />
                    <Action
                      title="Copy Input"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(record.input);
                        await showToast({ style: Toast.Style.Success, title: "Input copied" });
                      }}
                    />
                    <Action
                      title="Delete Record"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(record)}
                    />
                    {records.length > 1 && (
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={handleClearAll}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface RecordDetailViewProps {
  record: UsageRecord;
  recipeName: string;
}

function RecordDetailView({ record, recipeName }: RecordDetailViewProps) {
  const formatFullDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleCopyOutput = async () => {
    await Clipboard.copy(record.output);
    await showToast({ style: Toast.Style.Success, title: "Output copied" });
  };

  const handleCopyInput = async () => {
    await Clipboard.copy(record.input);
    await showToast({ style: Toast.Style.Success, title: "Input copied" });
  };

  const markdown = `## Input

\`\`\`
${record.input}
\`\`\`

${
  record.additionalPrompt
    ? `## Additional Requirements

\`\`\`
${record.additionalPrompt}
\`\`\`

`
    : ""
}## Output

\`\`\`
${record.output}
\`\`\``;

  return (
    <Detail
      navigationTitle={`${recipeName} - Record`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Recipe" text={recipeName} />
          <Detail.Metadata.Label title="Time" text={formatFullDate(record.createdAt)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Input Length" text={`${record.input.length} chars`} />
          <Detail.Metadata.Label title="Output Length" text={`${record.output.length} chars`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Copy Output" icon={Icon.CopyClipboard} onAction={handleCopyOutput} />
          <Action
            title="Copy Input"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={handleCopyInput}
          />
        </ActionPanel>
      }
    />
  );
}
