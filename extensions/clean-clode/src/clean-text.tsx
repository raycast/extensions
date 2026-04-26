import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { detectAndClean, CleanOptions } from "./cleaner";

interface HistoryItem {
  id: number;
  timestamp: string;
  cleaned: string;
  original: string;
}

const HISTORY_KEY = "clean-clode-history";
const MAX_HISTORY = 50;

async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveToHistory(cleaned: string, original: string): Promise<void> {
  const history = await getHistory();
  const newItem: HistoryItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    cleaned,
    original,
  };
  const updated = [newItem, ...history].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

async function deleteHistoryItem(id: number): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

async function clearAllHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function CleanedDetail({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={`## Cleaned Output\n\n\`\`\`\n${item.cleaned}\n\`\`\``}
      navigationTitle="Cleaned Text"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Cleaned"
            text={formatDate(item.timestamp)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Original (first 200 chars)"
            text={item.original.slice(0, 200)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Cleaned Text"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(item.cleaned);
              await showHUD("✅ Copied to clipboard");
            }}
          />
          <Action
            title="Delete This Item"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              await deleteHistoryItem(item.id);
              onDelete();
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

const COLLAPSE_SPACES_KEY = "collapse-spaces-preference";

function CleanForm({ onCleaned }: { onCleaned: () => void }) {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [collapseSpaces, setCollapseSpaces] = useState(false);
  const [cleanedResult, setCleanedResult] = useState<string | null>(null);

  useEffect(() => {
    LocalStorage.getItem<string>(COLLAPSE_SPACES_KEY).then((val) => {
      if (val !== undefined) setCollapseSpaces(val === "true");
    });
  }, []);

  async function handleCollapseSpacesChange(value: boolean) {
    setCollapseSpaces(value);
    await LocalStorage.setItem(COLLAPSE_SPACES_KEY, String(value));
  }

  async function handleClean(
    overrideText?: string,
    overrideOptions?: CleanOptions,
  ) {
    const textToClean = overrideText ?? inputText;
    if (!textToClean.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No input",
        message: "Paste some text first",
      });
      return;
    }
    setIsProcessing(true);
    const options: CleanOptions = overrideOptions ?? { collapseSpaces };
    const cleaned = detectAndClean(textToClean, options);
    await saveToHistory(cleaned, textToClean);
    await Clipboard.copy(cleaned);
    setIsProcessing(false);
    onCleaned();
    setCleanedResult(cleaned);
    await showToast({
      style: Toast.Style.Success,
      title: "Cleaned",
      message: "Copied to clipboard",
    });
  }

  if (cleanedResult !== null) {
    return (
      <Detail
        markdown={`## Cleaned Output\n\n\`\`\`\n${cleanedResult}\n\`\`\``}
        navigationTitle="Cleaned Text"
        actions={
          <ActionPanel>
            <Action
              title="Copy to Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(cleanedResult);
                await showHUD("✅ Copied to clipboard");
              }}
            />
            <Action
              title="Clean Another"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                setCleanedResult(null);
                setInputText("");
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Clean Clode"
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          <Action
            title="Clean My Clode"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => handleClean()}
          />
          <Action
            title="Paste from Clipboard & Clean"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              const { text } = await Clipboard.read();
              if (text) {
                setInputText(text);
                await handleClean(text, { collapseSpaces });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Clean Clode"
        text="Paste mangled Claude Code / Codex terminal output below. Removes pipes, box characters, broken line wraps, and extra whitespace."
      />
      <Form.TextArea
        id="inputText"
        title="Input"
        placeholder="Paste your mangled Claude Code terminal text here..."
        value={inputText}
        onChange={setInputText}
        autoFocus
      />
      <Form.Checkbox
        id="collapseSpaces"
        label="Collapse extra spaces between words"
        info="Removes padding spaces from narrow terminal output (e.g. multiple spaces between words)"
        value={collapseSpaces}
        onChange={handleCollapseSpacesChange}
      />
    </Form>
  );
}

export default function Command() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadHistory() {
    const items = await getHistory();
    setHistory(items);
    setIsLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function openCleanForm() {
    push(<CleanForm onCleaned={loadHistory} />);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Clean Clode"
      searchBarPlaceholder="Search history..."
      actions={
        <ActionPanel>
          <Action
            title="Clean New Text"
            icon={Icon.Wand}
            onAction={openCleanForm}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Actions">
        <List.Item
          title="Clean New Text"
          subtitle="Paste and clean Claude Code / Codex output"
          icon={{ source: Icon.Wand, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Open" icon={Icon.Wand} onAction={openCleanForm} />
              <Action
                title="Clean Clipboard Directly"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  const { text } = await Clipboard.read();
                  if (!text?.trim()) {
                    await showHUD("❌ Clipboard is empty");
                    return;
                  }
                  const cleaned = detectAndClean(text);
                  await saveToHistory(cleaned, text);
                  await Clipboard.copy(cleaned);
                  loadHistory();
                  await showHUD("✅ Cleaned & copied to clipboard");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {history.length > 0 && (
        <List.Section title={`History (${history.length})`}>
          {history.map((item) => (
            <List.Item
              key={item.id}
              title={item.cleaned.split("\n")[0].slice(0, 80)}
              subtitle={formatDate(item.timestamp)}
              icon={{ source: Icon.Document, tintColor: Color.Blue }}
              accessories={[{ text: `${item.cleaned.length} chars` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Cleaned Text"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(item.cleaned);
                      await showHUD("✅ Copied to clipboard");
                    }}
                  />
                  <Action
                    title="View Full Text"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(<CleanedDetail item={item} onDelete={loadHistory} />)
                    }
                  />
                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await deleteHistoryItem(item.id);
                      await loadHistory();
                    }}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Clear All History?",
                        message: "This cannot be undone.",
                        primaryAction: {
                          title: "Clear All",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        await clearAllHistory();
                        await loadHistory();
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {history.length === 0 && !isLoading && (
        <List.Section title="History">
          <List.Item
            title="No history yet"
            subtitle="Start cleaning some text!"
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          />
        </List.Section>
      )}
    </List>
  );
}
