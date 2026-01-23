import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  loadDictionary,
  toEntryList,
  addSimpleEntry,
  addReplacementRule,
  addContextRule,
  updateEntry,
  deleteEntry,
  getTypeDisplayName,
  DictionaryEntry,
  DictionaryEntryType,
  DICTIONARY_PATH,
} from "./utils/dictionary";

// Type colors for tags
const TYPE_COLORS: Record<DictionaryEntryType, Color> = {
  simple: Color.Blue,
  replacement: Color.Purple,
  context: Color.Orange,
};

// Type icons
const TYPE_ICONS: Record<DictionaryEntryType, Icon> = {
  simple: Icon.Text,
  replacement: Icon.Wand,
  context: Icon.Document,
};

// Main dictionary list view
export default function ManageDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<DictionaryEntryType | "all">(
    "all",
  );

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await loadDictionary();
      setEntries(toEntryList(data));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Dictionary",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = useCallback(
    async (entry: DictionaryEntry) => {
      const confirmed = await confirmAlert({
        title: "Delete Entry",
        message: `Delete "${entry.pattern}" → "${entry.replacement}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        try {
          await deleteEntry(entry);
          await loadEntries();
          showToast({
            style: Toast.Style.Success,
            title: "Entry Deleted",
          });
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to Delete",
            message: String(error),
          });
        }
      }
    },
    [loadEntries],
  );

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesSearch =
      !searchText ||
      entry.pattern.toLowerCase().includes(searchText.toLowerCase()) ||
      entry.replacement.toLowerCase().includes(searchText.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Group entries by type
  const simpleEntries = filteredEntries.filter((e) => e.type === "simple");
  const replacementEntries = filteredEntries.filter(
    (e) => e.type === "replacement",
  );
  const contextEntries = filteredEntries.filter((e) => e.type === "context");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dictionary entries..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filterType}
          onChange={(value) =>
            setFilterType(value as DictionaryEntryType | "all")
          }
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item
            title="Simple"
            value="simple"
            icon={TYPE_ICONS.simple}
          />
          <List.Dropdown.Item
            title="Replacement"
            value="replacement"
            icon={TYPE_ICONS.replacement}
          />
          <List.Dropdown.Item
            title="Context"
            value="context"
            icon={TYPE_ICONS.context}
          />
        </List.Dropdown>
      }
    >
      {/* Empty state */}
      {!isLoading && filteredEntries.length === 0 && (
        <List.EmptyView
          title="No Dictionary Entries"
          description="Add a new entry to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Entry"
                icon={Icon.Plus}
                target={<AddEntryForm onSuccess={loadEntries} />}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Simple replacements section */}
      {simpleEntries.length > 0 && (
        <List.Section
          title={`Simple (${simpleEntries.length})`}
          subtitle="Always replaced"
        >
          {simpleEntries.map((entry) => (
            <DictionaryListItem
              key={entry.id}
              entry={entry}
              onRefresh={loadEntries}
              onDelete={handleDelete}
            />
          ))}
        </List.Section>
      )}

      {/* Replacement rules section */}
      {replacementEntries.length > 0 && (
        <List.Section
          title={`Replacement (${replacementEntries.length})`}
          subtitle="Supports regex patterns"
        >
          {replacementEntries.map((entry) => (
            <DictionaryListItem
              key={entry.id}
              entry={entry}
              onRefresh={loadEntries}
              onDelete={handleDelete}
            />
          ))}
        </List.Section>
      )}

      {/* Context rules section */}
      {contextEntries.length > 0 && (
        <List.Section
          title={`Context (${contextEntries.length})`}
          subtitle="Conditional replacement based on keywords"
        >
          {contextEntries.map((entry) => (
            <DictionaryListItem
              key={entry.id}
              entry={entry}
              onRefresh={loadEntries}
              onDelete={handleDelete}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// List item component
function DictionaryListItem({
  entry,
  onRefresh,
  onDelete,
}: {
  entry: DictionaryEntry;
  onRefresh: () => Promise<void>;
  onDelete: (entry: DictionaryEntry) => Promise<void>;
}) {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: getTypeDisplayName(entry.type),
        color: TYPE_COLORS[entry.type],
      },
    },
  ];

  // Add context info for context rules
  if (
    entry.type === "context" &&
    entry.context_keywords &&
    entry.context_keywords.length > 0
  ) {
    accessories.unshift({
      text: `Keywords: ${entry.context_keywords.slice(0, 2).join(", ")}${entry.context_keywords.length > 2 ? "..." : ""}`,
      icon: Icon.Tag,
    });
  }

  // Add regex indicator
  if (entry.type === "replacement" && entry.is_regex) {
    accessories.unshift({
      tag: { value: "Regex", color: Color.Green },
    });
  }

  return (
    <List.Item
      title={entry.pattern}
      subtitle={`→ ${entry.replacement}`}
      icon={TYPE_ICONS[entry.type]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Edit">
            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              target={<EditEntryForm entry={entry} onSuccess={onRefresh} />}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => onDelete(entry)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Add">
            <Action.Push
              title="Add New Entry"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddEntryForm onSuccess={onRefresh} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action.ShowInFinder
              title="Show Dictionary File"
              path={DICTIONARY_PATH}
            />
            <Action.CopyToClipboard
              title="Copy Pattern"
              content={entry.pattern}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Add entry form
function AddEntryForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [entryType, setEntryType] = useState<DictionaryEntryType>("simple");
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [contextKeywords, setContextKeywords] = useState("");
  const [negativeKeywords, setNegativeKeywords] = useState("");
  const [windowSize, setWindowSize] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!pattern.trim() || !replacement.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Pattern and replacement are required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      switch (entryType) {
        case "simple":
          await addSimpleEntry(pattern, replacement);
          break;
        case "replacement":
          await addReplacementRule(pattern, replacement, isRegex);
          break;
        case "context":
          await addContextRule(
            pattern,
            replacement,
            contextKeywords
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            negativeKeywords
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            parseInt(windowSize) || 50,
          );
          break;
      }

      showToast({
        style: Toast.Style.Success,
        title: "Entry Added",
      });

      await onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    entryType,
    pattern,
    replacement,
    isRegex,
    contextKeywords,
    negativeKeywords,
    windowSize,
    onSuccess,
    pop,
  ]);

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        value={entryType}
        onChange={(value) => setEntryType(value as DictionaryEntryType)}
      >
        <Form.Dropdown.Item
          value="simple"
          title="Simple"
          icon={TYPE_ICONS.simple}
        />
        <Form.Dropdown.Item
          value="replacement"
          title="Replacement"
          icon={TYPE_ICONS.replacement}
        />
        <Form.Dropdown.Item
          value="context"
          title="Context"
          icon={TYPE_ICONS.context}
        />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="pattern"
        title="Pattern"
        placeholder="Text to find"
        value={pattern}
        onChange={setPattern}
      />

      <Form.TextField
        id="replacement"
        title="Replacement"
        placeholder="Text to replace with"
        value={replacement}
        onChange={setReplacement}
      />

      {/* Replacement rule specific fields */}
      {entryType === "replacement" && (
        <Form.Checkbox
          id="is_regex"
          label="Treat as regular expression"
          value={isRegex}
          onChange={setIsRegex}
        />
      )}

      {/* Context rule specific fields */}
      {entryType === "context" && (
        <>
          <Form.Separator />
          <Form.TextField
            id="context_keywords"
            title="Context Keywords"
            placeholder="Comma separated (e.g., company, project)"
            info="Only replace when these keywords are nearby"
            value={contextKeywords}
            onChange={setContextKeywords}
          />

          <Form.TextField
            id="negative_keywords"
            title="Negative Keywords"
            placeholder="Comma separated (e.g., furniture, store)"
            info="Do not replace when these keywords are nearby"
            value={negativeKeywords}
            onChange={setNegativeKeywords}
          />

          <Form.TextField
            id="window_size"
            title="Window Size"
            placeholder="50"
            info="Character range to search for keywords"
            value={windowSize}
            onChange={setWindowSize}
          />
        </>
      )}

      <Form.Separator />
      <Form.Description
        title="Tip"
        text={
          entryType === "simple"
            ? "Simple replacements are always applied. Best for proper nouns and common terms."
            : entryType === "replacement"
              ? "Replacement rules support regex patterns for complex matching."
              : "Context rules conditionally replace based on surrounding text. Best for homophones."
        }
      />
    </Form>
  );
}

// Edit entry form
function EditEntryForm({
  entry,
  onSuccess,
}: {
  entry: DictionaryEntry;
  onSuccess: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [pattern, setPattern] = useState(entry.pattern);
  const [replacement, setReplacement] = useState(entry.replacement);
  const [isRegex, setIsRegex] = useState(entry.is_regex || false);
  const [contextKeywords, setContextKeywords] = useState(
    (entry.context_keywords || []).join(", "),
  );
  const [negativeKeywords, setNegativeKeywords] = useState(
    (entry.negative_keywords || []).join(", "),
  );
  const [windowSize, setWindowSize] = useState(String(entry.window_size || 50));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!pattern.trim() || !replacement.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Pattern and replacement are required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedEntry: DictionaryEntry = {
        ...entry,
        pattern,
        replacement,
        is_regex: isRegex,
        context_keywords: contextKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        negative_keywords: negativeKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        window_size: parseInt(windowSize) || 50,
      };

      await updateEntry(updatedEntry);

      showToast({
        style: Toast.Style.Success,
        title: "Entry Updated",
      });

      await onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    entry,
    pattern,
    replacement,
    isRegex,
    contextKeywords,
    negativeKeywords,
    windowSize,
    onSuccess,
    pop,
  ]);

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Type"
        text={`${getTypeDisplayName(entry.type)}`}
      />

      <Form.Separator />

      <Form.TextField
        id="pattern"
        title="Pattern"
        placeholder="Text to find"
        value={pattern}
        onChange={setPattern}
      />

      <Form.TextField
        id="replacement"
        title="Replacement"
        placeholder="Text to replace with"
        value={replacement}
        onChange={setReplacement}
      />

      {/* Replacement rule specific fields */}
      {entry.type === "replacement" && (
        <Form.Checkbox
          id="is_regex"
          label="Treat as regular expression"
          value={isRegex}
          onChange={setIsRegex}
        />
      )}

      {/* Context rule specific fields */}
      {entry.type === "context" && (
        <>
          <Form.Separator />
          <Form.TextField
            id="context_keywords"
            title="Context Keywords"
            placeholder="Comma separated (e.g., company, project)"
            info="Only replace when these keywords are nearby"
            value={contextKeywords}
            onChange={setContextKeywords}
          />

          <Form.TextField
            id="negative_keywords"
            title="Negative Keywords"
            placeholder="Comma separated (e.g., furniture, store)"
            info="Do not replace when these keywords are nearby"
            value={negativeKeywords}
            onChange={setNegativeKeywords}
          />

          <Form.TextField
            id="window_size"
            title="Window Size"
            placeholder="50"
            info="Character range to search for keywords"
            value={windowSize}
            onChange={setWindowSize}
          />
        </>
      )}
    </Form>
  );
}
