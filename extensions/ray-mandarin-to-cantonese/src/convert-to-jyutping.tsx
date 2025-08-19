import { List, ActionPanel, Action, showToast, Toast, Clipboard, environment } from "@raycast/api";
import { getJyutpingList } from "to-jyutping";
import { exec } from "child_process";
import { promisify } from "util";
import { useEffect, useState } from "react";
import { promises as fs } from "fs";
import path from "path";

const execPromise = promisify(exec);
const HISTORY_FILE = path.join(environment.supportPath, "jyutping-history.json");
const MAX_HISTORY = 20;

interface Arguments {
  text: string;
}

interface HistoryItem {
  text: string;
  jyutping: string;
  timestamp: number;
}

export default function Command(props: { arguments: Arguments }) {
  const [searchText, setSearchText] = useState(props.arguments.text || "");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Load history from file on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        console.log("Support path:", environment.supportPath);
        console.log("History file path:", HISTORY_FILE);

        // Create support directory if it doesn't exist
        await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });

        // Try to read the history file
        let existingHistory: HistoryItem[] = [];
        try {
          const data = await fs.readFile(HISTORY_FILE, "utf-8");
          existingHistory = JSON.parse(data);
          console.log("Loaded existing history:", existingHistory);
          setHistory(existingHistory);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Error reading history file:", error);
          }
          // If file doesn't exist, create it with empty array
          await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");
        }

        // Convert text if provided in arguments
        if (props.arguments.text) {
          await handleConvert(props.arguments.text);
        }
      } catch (error) {
        console.error("Error initializing history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const copyJyutpingToClipboard = async (jyutping: string) => {
    await Clipboard.copy(jyutping);
    await showToast({
      style: Toast.Style.Success,
      title: "Jyutping copied to clipboard",
    });
  };

  const handleConvert = async (text: string) => {
    if (!text.trim()) return;

    // Convert text to Jyutping
    const jyutpingResult = getJyutpingList(text);
    const formattedJyutping = jyutpingResult
      .map(([char, pronunciation]) => `${char}${pronunciation ? ` (${pronunciation})` : ""}`)
      .join(" ");

    const newItem: HistoryItem = {
      text,
      jyutping: formattedJyutping,
      timestamp: Date.now(),
    };

    // Add to history
    let updatedHistory: HistoryItem[] = [];
    try {
      // Read existing history from file
      const existingData = await fs.readFile(HISTORY_FILE, "utf-8");
      const existingHistory = JSON.parse(existingData);

      // Merge new item with existing history
      updatedHistory = [newItem, ...existingHistory.filter((item: HistoryItem) => item.text !== text)].slice(
        0,
        MAX_HISTORY,
      );

      // Save merged history back to file
      await fs.writeFile(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2), "utf-8");

      // Update state
      setHistory(updatedHistory);
      console.log("Saved updated history:", updatedHistory);
    } catch (error) {
      // If there's an error reading the file, start fresh with just the new item
      updatedHistory = [newItem];
      await fs.writeFile(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2), "utf-8");
      setHistory(updatedHistory);

      console.error("Error updating history:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "提醒：歷史記錄可能不完整",
        message: "更新歷史記錄時出錯",
      });
    }

    setSelectedItem(newItem);

    // Play pronunciation and copy Jyutping
  };

  const playPronunciation = async (text: string) => {
    if (process.platform === "darwin") {
      try {
        await execPromise(`say -v Sinji -r 0.8 "${text}"`);
        showToast({
          style: Toast.Style.Success,
          title: "Playing Cantonese pronunciation",
        });
      } catch (error) {
        console.error("Speech error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to play pronunciation",
          message: String(error),
        });
      }
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      item.text.toLowerCase().includes(searchText.toLowerCase()) ||
      item.jyutping.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Chinese text..."
      searchText={searchText}
      selectedItemId={selectedItem?.timestamp.toString()}
      onSelectionChange={(id) => {
        const item = filteredHistory.find((h) => h.timestamp.toString() === id);
        if (item) {
          setSelectedItem(item);
        }
      }}
    >
      {searchText && !filteredHistory.some((item) => item.text === searchText) && (
        <List.Item
          title="Convert New Text"
          subtitle={searchText}
          actions={
            <ActionPanel>
              <Action title="Convert and Play" onAction={() => handleConvert(searchText)} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="History">
        {filteredHistory.map((item) => (
          <List.Item
            key={item.timestamp}
            id={item.timestamp.toString()}
            title={item.text}
            subtitle={item.jyutping}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Jyutping"
                    onAction={async () => {
                      await Promise.all([copyJyutpingToClipboard(item.jyutping), playPronunciation(item.text)]);
                    }}
                  />
                  <Action
                    title="Play Cantonese"
                    onAction={() => playPronunciation(item.text)}
                    shortcut={{ modifiers: ["opt"], key: "p" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
