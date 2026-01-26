import { useEffect, useState, useCallback, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  environment,
  Keyboard,
} from "@raycast/api";

interface ClipboardItem {
  id: string;
  text: string;
  words: string[];
}

const WPM_OPTIONS = [300, 400, 500, 600, 700, 800, 900];
const MAX_WORD_LENGTH = 15;
const CLIPBOARD_OFFSET_LIMIT = 5;
const MIN_WORD_COUNT = 10;
const POLL_INTERVAL = 1000;

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Index>();
  const defaultWpm = parseInt(preferences.wpm) || 400;

  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWpm, setCurrentWpm] = useState(defaultWpm);

  const [deletedTexts, setDeletedTexts] = useState<Set<string> | null>(null);

  const selectedItem = clipboardHistory.find((item) => item.id === selectedId);
  const words = selectedItem?.words || [];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  // Load saved preferences on mount
  useEffect(() => {
    async function load() {
      const savedWpm = await LocalStorage.getItem<string>("savedWpm");
      if (savedWpm) setCurrentWpm(parseInt(savedWpm));

      const savedDeleted = await LocalStorage.getItem<string>("deletedTexts");
      setDeletedTexts(savedDeleted ? new Set(JSON.parse(savedDeleted)) : new Set());
    }
    load();
  }, []);

  // Poll clipboard history
  useEffect(() => {
    if (deletedTexts === null) return;
    const deleted = deletedTexts;

    async function loadClipboardHistory() {
      try {
        const items: ClipboardItem[] = [];

        for (let offset = 0; offset <= CLIPBOARD_OFFSET_LIMIT; offset++) {
          const clipboardText = await Clipboard.readText({ offset });

          if (clipboardText?.trim()) {
            const text = clipboardText.trim();
            const itemId = `${offset}-${text}`;

            if (!items.some((item) => item.text === text) && !deleted.has(itemId)) {
              const wordArray = text.split(/\s+/).filter((w) => w.length > 0);

              if (wordArray.length >= MIN_WORD_COUNT) {
                items.push({ id: itemId, text, words: wordArray });
              }
            }
          }
        }

        setClipboardHistory((prev) => {
          if (prev.length !== items.length) return items;
          if (prev.every((p, i) => p.id === items[i]?.id)) return prev;
          return items;
        });

        if (items.length > 0 && (!selectedId || !items.some((item) => item.id === selectedId))) {
          setSelectedId(items[0].id);
          setCurrentIndex(0);
          setIsPlaying(true);
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
          message: String(error),
        });
      }
    }

    loadClipboardHistory();
    const interval = setInterval(loadClipboardHistory, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedId, deletedTexts]);

  // Word playback timer
  useEffect(() => {
    const currentWords = wordsRef.current;

    if (!isPlaying || currentWords.length === 0 || currentIndex >= currentWords.length) {
      return;
    }

    const baseInterval = 60000 / currentWpm;
    const currentWord = currentWords[currentIndex] || "";
    const hasPunctuation = /[.!?]$/.test(currentWord);
    const delay = hasPunctuation ? baseInterval * 2 : baseInterval;

    intervalRef.current = setTimeout(() => {
      const next = currentIndex + 1;
      if (next >= currentWords.length) {
        setIsPlaying(false);
      } else {
        setCurrentIndex(next);
      }
    }, delay);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, selectedId, currentWpm, currentIndex]);

  const togglePlayPause = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentIndex, words.length]);

  const getCurrentChunk = () => {
    if (words.length === 0) return "";
    const word = words[currentIndex] || "";
    if (word.length > MAX_WORD_LENGTH) return "—";
    if (/[[\]()!#*`]/.test(word)) return "—";
    return word;
  };

  const getOrpIndex = (word: string) => Math.floor(word.length / 2);

  const createWordSvg = (word: string, orpIdx: number) => {
    const isDark = environment.appearance === "dark";

    const fontSize = 56;
    const charWidth = 34;
    const fixedWidth = 600;
    const svgHeight = 400;
    const centerY = svgHeight / 2 + 50;
    const centerX = fixedWidth / 2;
    const orpOffset = orpIdx * charWidth + charWidth / 2;
    const startX = centerX - orpOffset;

    // Use theme-appropriate colors for better contrast
    const textColor = isDark ? "#e5e5e5" : "#1a1a1a";
    const barBgColor = isDark ? "#333" : "#a3a3a3";

    const chars = word
      .split("")
      .map((char, i) => {
        const escaped = char.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const fill = i === orpIdx ? "#ef4444" : textColor;
        const x = startX + i * charWidth;
        return `<text x="${x}" y="${centerY}" fill="${fill}" font-size="${fontSize}" font-weight="500" font-family="SF Mono, Menlo, Monaco, monospace" dominant-baseline="central">${escaped}</text>`;
      })
      .join("");

    const progress = words.length > 1 ? (currentIndex / (words.length - 1)) * 100 : 0;
    const barWidth = 200;
    const barHeight = 2;
    const barX = (fixedWidth - barWidth) / 2;
    const barY = svgHeight - 40;
    const filledWidth = Math.round((barWidth * progress) / 100);
    const progressBar = `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${barBgColor}" rx="1"/><rect x="${barX}" y="${barY}" width="${filledWidth}" height="${barHeight}" fill="#ef4444" rx="1"/>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fixedWidth}" height="${svgHeight}" viewBox="0 0 ${fixedWidth} ${svgHeight}">${chars}${progressBar}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  };

  const getMarkdown = () => {
    const word = getCurrentChunk();
    if (!word) return "# No Text Found\n\nCopy some text to your clipboard";

    const orpIdx = getOrpIndex(word);
    const svgUrl = createWordSvg(word, orpIdx);
    return `![${word}](${svgUrl})`;
  };

  const selectItem = (id: string) => {
    setSelectedId(id);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handleDelete = async (item: ClipboardItem) => {
    const newDeleted = new Set(deletedTexts || []);
    newDeleted.add(item.id);
    setDeletedTexts(newDeleted);
    await LocalStorage.setItem("deletedTexts", JSON.stringify(Array.from(newDeleted)));

    setClipboardHistory((prev) => {
      const remaining = prev.filter((i) => i.id !== item.id);
      if (selectedId === item.id) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    showToast({ style: Toast.Style.Success, title: "Deleted" });
  };

  const handleWpmChange = (newValue: string) => {
    const newWpm = parseInt(newValue);
    setCurrentWpm(newWpm);
    LocalStorage.setItem("savedWpm", newValue);
  };

  const increaseWpm = useCallback(() => {
    const currentIdx = WPM_OPTIONS.indexOf(currentWpm);
    if (currentIdx < WPM_OPTIONS.length - 1) {
      const newWpm = WPM_OPTIONS[currentIdx + 1];
      setCurrentWpm(newWpm);
      LocalStorage.setItem("savedWpm", String(newWpm));
      showToast({ style: Toast.Style.Success, title: `${newWpm} WPM` });
    }
  }, [currentWpm]);

  const decreaseWpm = useCallback(() => {
    const currentIdx = WPM_OPTIONS.indexOf(currentWpm);
    if (currentIdx > 0) {
      const newWpm = WPM_OPTIONS[currentIdx - 1];
      setCurrentWpm(newWpm);
      LocalStorage.setItem("savedWpm", String(newWpm));
      showToast({ style: Toast.Style.Success, title: `${newWpm} WPM` });
    }
  }, [currentWpm]);

  return (
    <List
      isLoading={isLoading || deletedTexts === null}
      isShowingDetail
      searchBarPlaceholder="Search clipboard history..."
      onSelectionChange={(id) => id && selectItem(id)}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Speed" value={String(currentWpm)} onChange={handleWpmChange}>
          {WPM_OPTIONS.map((speed) => (
            <List.Dropdown.Item key={speed} title={`${speed} WPM`} value={String(speed)} />
          ))}
        </List.Dropdown>
      }
    >
      {clipboardHistory.length === 0 ? (
        <List.EmptyView title="Nothing to Parse" description="Copy some text first, then open Parse." />
      ) : (
        clipboardHistory.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={item.text.slice(0, 60) + (item.text.length > 60 ? "..." : "")}
            detail={item.id === selectedId ? <List.Item.Detail markdown={getMarkdown()} /> : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={isPlaying ? "Pause" : "Play"}
                  icon={isPlaying ? Icon.Pause : Icon.Play}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={togglePlayPause}
                />
                <Action
                  title="Increase Speed"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: [], key: "arrowRight" }}
                  onAction={increaseWpm}
                />
                <Action
                  title="Decrease Speed"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: [], key: "arrowLeft" }}
                  onAction={decreaseWpm}
                />
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={item.text}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Delete"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(item)}
                />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="View on GitHub"
                    url="https://github.com/traf/parse"
                    icon={Icon.ArrowNe}
                  />
                  <Action.OpenInBrowser
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Follow @traf"
                    url="https://x.com/traf"
                    icon={Icon.ArrowNe}
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
