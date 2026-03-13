import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  getApplications,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, usePromise, executeSQL } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import {
  getDbPath,
  dbExists,
  escapeSQL,
  validateUUID,
  writeSQL,
  WISPR_FLOW_BUNDLE_ID,
} from "./db";
import { DictionaryEntry } from "./types";

function formatDateForWispr(date: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms} +00:00`;
}

export default function Command() {
  const dbPath = getDbPath();

  if (!dbExists()) {
    return (
      <Detail
        markdown={`## Wispr Flow Database Not Found\n\nCould not find the Wispr Flow database at:\n\n\`${dbPath}\`\n\nMake sure [Wispr Flow](https://wisprflow.ai) is installed and has been used at least once, or update the database path in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const [searchText, setSearchText] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { isLoading, data, revalidate } = useCachedPromise(
    () =>
      executeSQL<DictionaryEntry>(
        dbPath,
        `SELECT id, phrase, replacement, manualEntry, source, frequencyUsed, createdAt, modifiedAt, isDeleted
         FROM Dictionary WHERE isDeleted = 0 ORDER BY createdAt DESC`,
      ),
    [],
  );

  const words = data ?? [];

  const filteredWords = words.filter((w) => {
    const matchesSearch =
      w.phrase.toLowerCase().includes(searchText.toLowerCase()) ||
      (w.replacement &&
        w.replacement.toLowerCase().includes(searchText.toLowerCase()));
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "manual" && w.source === "manual") ||
      (sourceFilter === "learned" && w.source !== "manual");
    return matchesSearch && matchesSource;
  });

  const manualWords = filteredWords.filter((w) => w.source === "manual");
  const learnedWords = filteredWords.filter((w) => w.source !== "manual");

  const handleDelete = useCallback(
    async (entry: DictionaryEntry) => {
      const confirmed = await confirmAlert({
        title: "Delete Word",
        message: `Are you sure you want to delete "${entry.phrase}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        const validId = validateUUID(entry.id);
        const now = formatDateForWispr(new Date());
        writeSQL(
          `UPDATE Dictionary SET isDeleted = 1, modifiedAt = '${now}' WHERE id = '${validId}'`,
        );
        revalidate();
        await showToast({
          style: Toast.Style.Success,
          title: "Word Deleted",
          message: `"${entry.phrase}" removed from dictionary`,
          primaryAction: {
            title: "Undo",
            onAction: async (toast) => {
              writeSQL(
                `UPDATE Dictionary SET isDeleted = 0, modifiedAt = '${formatDateForWispr(new Date())}' WHERE id = '${validId}'`,
              );
              revalidate();
              await toast.hide();
            },
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [dbPath, revalidate],
  );

  function EditWordForm({
    entry,
    onEdit,
  }: {
    entry: DictionaryEntry;
    onEdit: () => void;
  }) {
    const { pop } = useNavigation();

    async function handleSubmit(values: {
      phrase: string;
      replacement: string;
    }) {
      const phrase = values.phrase.trim();
      if (!phrase) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Word or phrase is required",
        });
        return;
      }

      try {
        const validId = validateUUID(entry.id);
        const now = formatDateForWispr(new Date());
        const escapedPhrase = escapeSQL(phrase, 255);
        const replacementValue = values.replacement?.trim()
          ? `'${escapeSQL(values.replacement.trim(), 255)}'`
          : "NULL";
        writeSQL(
          `UPDATE Dictionary SET phrase = '${escapedPhrase}', replacement = ${replacementValue}, modifiedAt = '${now}' WHERE id = '${validId}'`,
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Word Updated",
          message: `"${phrase}" updated`,
        });
        onEdit();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Update",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="phrase"
          title="Word or Phrase"
          defaultValue={entry.phrase}
        />
        <Form.TextField
          id="replacement"
          title="Replacement (Optional)"
          defaultValue={entry.replacement ?? ""}
          info="If set, Wispr Flow will substitute this text when the word is recognized"
        />
      </Form>
    );
  }

  const { data: installedApps } = usePromise(getApplications);
  const wisprFlowPath = useMemo(() => {
    return (installedApps ?? []).find(
      (app) => app.bundleId === WISPR_FLOW_BUNDLE_ID,
    )?.path;
  }, [installedApps]);

  function sourceLabel(source: string): string {
    switch (source) {
      case "manual":
        return "Manual";
      case "user_edits":
        return "Learned from corrections";
      default:
        return source;
    }
  }

  function renderWordItem(entry: DictionaryEntry) {
    return (
      <List.Item
        key={entry.id}
        title={entry.phrase}
        accessories={
          entry.replacement
            ? [{ tag: { value: entry.replacement, color: Color.Blue } }]
            : []
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Information" />
                <List.Item.Detail.Metadata.Label
                  title="Phrase"
                  text={entry.phrase}
                />
                <List.Item.Detail.Metadata.Label
                  title="Replacement"
                  text={entry.replacement ?? "None"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Source"
                  text={sourceLabel(entry.source)}
                />
                {entry.frequencyUsed > 0 ? (
                  <List.Item.Detail.Metadata.Label
                    title="Times Used"
                    text={String(entry.frequencyUsed)}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Label
                  title="Added"
                  text={new Date(entry.createdAt).toLocaleString()}
                />
                <List.Item.Detail.Metadata.Label
                  title="Modified"
                  text={new Date(entry.modifiedAt).toLocaleString()}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Word"
                content={entry.phrase}
              />
              {entry.replacement ? (
                <Action.CopyToClipboard
                  title="Copy Replacement"
                  content={entry.replacement}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              ) : null}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Edit Word"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditWordForm entry={entry} onEdit={revalidate} />}
              />
              <Action
                title="Delete Word"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDelete(entry)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {wisprFlowPath ? (
                <Action.Open
                  title="Open Wispr Flow"
                  icon={Icon.Microphone}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  target={wisprFlowPath}
                />
              ) : null}
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search words..."
      onSearchTextChange={setSearchText}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Source"
          value={sourceFilter}
          onChange={setSourceFilter}
        >
          <List.Dropdown.Item title="All Words" value="all" />
          <List.Dropdown.Item title="Manual Entries" value="manual" />
          <List.Dropdown.Item title="Learned Words" value="learned" />
        </List.Dropdown>
      }
    >
      {filteredWords.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText ? "No Matching Words" : "No Words in Dictionary"}
          description={
            searchText
              ? "Try a different search term"
              : "Use 'Add Word to Wispr Flow' to add your first word"
          }
          icon={Icon.Book}
        />
      ) : (
        <>
          {manualWords.length > 0 && (
            <List.Section
              title="Manual Entries"
              subtitle={`${manualWords.length} words`}
            >
              {manualWords.map(renderWordItem)}
            </List.Section>
          )}
          {learnedWords.length > 0 && (
            <List.Section
              title="Learned Words"
              subtitle={`${learnedWords.length} words`}
            >
              {learnedWords.map(renderWordItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
