import {
  List,
  Action,
  ActionPanel,
  Clipboard,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
} from "change-case";

interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
}

interface Preferences {
  maxHistoryItems: string;
  historyRetentionDays: string;
  clearOnQuit: boolean;
}

const preferences = getPreferenceValues<Preferences>();
const MAX_HISTORY = parseInt(preferences.maxHistoryItems) || 50;
const RETENTION_DAYS = parseInt(preferences.historyRetentionDays) || 30;

export default function Command() {
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    loadHistory();
    checkClipboard();

    // Set up interval to check clipboard every 2 seconds
    const interval = setInterval(checkClipboard, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadHistory() {
    try {
      const stored = await LocalStorage.getItem<string>("clipboard-history");
      if (stored) {
        const items: ClipboardItem[] = JSON.parse(stored);

        // Filter out items older than retention period
        const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const filteredItems = items.filter((item) => item.timestamp > cutoffTime);

        if (filteredItems.length !== items.length) {
          // Update storage if items were filtered
          await LocalStorage.setItem("clipboard-history", JSON.stringify(filteredItems));
        }

        setClipboardHistory(filteredItems);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
    setIsLoading(false);
  }

  async function checkClipboard() {
    try {
      const currentText = await Clipboard.readText();
      if (currentText) {
        await addToHistory(currentText);
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  }

  async function addToHistory(text: string) {
    setClipboardHistory((prev) => {
      // Don't add if it's the same as the most recent item
      if (prev.length > 0 && prev[0].text === text) {
        return prev;
      }

      // Remove any existing duplicate from history
      const filteredHistory = prev.filter((item) => item.text !== text);

      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now(),
      };

      // Add new item at top and limit to MAX_HISTORY
      const updated = [newItem, ...filteredHistory].slice(0, MAX_HISTORY);
      LocalStorage.setItem("clipboard-history", JSON.stringify(updated));
      return updated;
    });
  }

  async function pasteTransformed(text: string, transformName: string) {
    try {
      await Clipboard.paste(text);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted",
        message: `As ${transformName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste",
        message: String(error),
      });
    }
  }

  async function copyTransformed(text: string, transformName: string) {
    try {
      await Clipboard.copy(text);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied",
        message: `As ${transformName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error),
      });
    }
  }

  async function clearHistory() {
    setClipboardHistory([]);
    await LocalStorage.removeItem("clipboard-history");
    await showToast({
      style: Toast.Style.Success,
      title: "History Cleared",
    });
  }

  const transformations = [
    { name: "Original", fn: (t: string) => t, icon: Icon.Text },
    { name: "lowercase", fn: (t: string) => t.toLowerCase(), icon: Icon.Lowercase },
    { name: "UPPERCASE", fn: (t: string) => t.toUpperCase(), icon: Icon.Uppercase },
    { name: "camelCase", fn: camelCase, icon: Icon.Text },
    { name: "PascalCase", fn: pascalCase, icon: Icon.Text },
    { name: "snake_case", fn: snakeCase, icon: Icon.Text },
    { name: "kebab-case", fn: kebabCase, icon: Icon.Text },
    { name: "CONSTANT_CASE", fn: constantCase, icon: Icon.Text },
    { name: "Title Case", fn: capitalCase, icon: Icon.Text },
    { name: "Sentence case", fn: sentenceCase, icon: Icon.Text },
    { name: "dot.case", fn: dotCase, icon: Icon.Text },
    { name: "path/case", fn: pathCase, icon: Icon.Text },
  ];

  function detectContentType(text: string): string {
    if (text.match(/^https?:\/\//)) return "URL";
    if (text.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) return "Email";
    if (text.match(/^\d+$/)) return "Number";
    if (text.match(/^[a-f0-9]{32,}$/i)) return "Hash/Token";
    if (text.match(/[{}[\]();]/) && text.split("\n").length > 1) return "Code";
    if (text.match(/^[A-Z0-9_-]{20,}$/)) return "ID/Token";
    return "Text";
  }

  function renderDetail(item: ClipboardItem) {
    const wordCount = item.text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const lineCount = item.text.split("\n").length;
    const contentType = detectContentType(item.text);

    const infoSection = `## Information

**Content type:** ${contentType}  
**Characters:** ${item.text.length}  
**Words:** ${wordCount}  
**Lines:** ${lineCount}  
**Copied:** ${new Date(item.timestamp).toLocaleString()}

---`;

    const markdown = `${infoSection}

# Original Text
\`\`\`
${item.text}
\`\`\`

---

# All Transformations

${transformations
  .map((transform) => {
    const transformed = transform.fn(item.text);
    return `## ${transform.name}
\`\`\`
${transformed}
\`\`\``;
  })
  .join("\n\n")}`;

    return <List.Item.Detail markdown={markdown} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search clipboard history..." isShowingDetail={showingDetail}>
      {clipboardHistory.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No Clipboard History"
          description="Copy something to get started"
        />
      ) : (
        clipboardHistory.map((item) => (
          <List.Item
            key={item.id}
            title={item.text.slice(0, 100)}
            subtitle={item.text.length > 100 ? "..." : ""}
            accessories={[{ text: new Date(item.timestamp).toLocaleTimeString() }]}
            detail={renderDetail(item)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Paste As">
                  {transformations.map((transform) => (
                    <Action
                      key={transform.name}
                      title={`Paste as ${transform.name}`}
                      icon={transform.icon}
                      onAction={() => pasteTransformed(transform.fn(item.text), transform.name)}
                    />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy As">
                  {transformations.map((transform) => (
                    <Action
                      key={transform.name}
                      title={`Copy as ${transform.name}`}
                      icon={Icon.Clipboard}
                      onAction={() => copyTransformed(transform.fn(item.text), transform.name)}
                    />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section title="View">
                  <Action
                    title="Toggle Detail"
                    icon={Icon.AppWindowSidebarLeft}
                    onAction={() => setShowingDetail(!showingDetail)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Management">
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearHistory}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  <Action
                    title="Refresh Clipboard"
                    icon={Icon.ArrowClockwise}
                    onAction={checkClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
