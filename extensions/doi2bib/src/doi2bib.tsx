import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  popToRoot,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { HistoryEntry, looksLikeDoi, relativeTime, addToHistory, extractDoi, formatBib } from "./utils";

const STORAGE_KEY = "doi2bib-history";

export default function Command() {
  const [doi, setDoi] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBib, setCurrentBib] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>("");

  useEffect(() => {
    async function init() {
      // Load history
      try {
        const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (stored) {
          const loaded = JSON.parse(stored) as HistoryEntry[];
          historyRef.current = loaded;
          setHistory(loaded);
        }
      } catch {
        // silently fallback to empty history
      }

      // Auto-fetch clipboard DOI
      try {
        const { text } = await Clipboard.read();
        const trimmed = extractDoi(text ?? "");
        if (looksLikeDoi(trimmed)) {
          setDoi(trimmed);
          fetchBib(trimmed);
        }
      } catch {
        // no clipboard access — skip
      }
    }
    init();
  }, []);

  async function fetchBib(rawDoi: string) {
    const trimmed = extractDoi(rawDoi);
    setDoi(trimmed);
    setIsLoading(true);
    setCurrentBib(null);
    try {
      const response = await fetch(`https://doi.org/${trimmed}`, {
        headers: { Accept: "application/x-bibtex" },
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bib = await response.text();
      if (!bib.trim()) {
        throw new Error("No BibTeX returned");
      }
      const formatted = formatBib(bib);
      setCurrentBib(formatted);
      const entry: HistoryEntry = { doi: trimmed, bib: formatted, fetchedAt: new Date().toISOString() };
      const updated = addToHistory(historyRef.current, entry);
      historyRef.current = updated;
      setHistory(updated);
      setSelectedItemId(trimmed);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Fetch failed", message });
    } finally {
      setIsLoading(false);
    }
  }

  const showFetchItem = looksLikeDoi(doi) && doi !== history[0]?.doi;

  async function clearHistory() {
    await LocalStorage.removeItem(STORAGE_KEY);
    historyRef.current = [];
    setHistory([]);
    setSelectedItemId("");
  }

  return (
    <List
      selectedItemId={selectedItemId}
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchText={doi}
      onSearchTextChange={setDoi}
      searchBarPlaceholder="Paste or type a DOI…"
    >
      {showFetchItem && (
        <List.Item
          id="fetch-item"
          title={`↩ Fetch: ${doi}`}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              markdown={currentBib ? `\`\`\`bibtex\n${currentBib}\n\`\`\`` : ""}
            />
          }
          actions={
            <ActionPanel>
              {currentBib ? (
                <Action.CopyToClipboard
                  title="Copy BibTeX"
                  content={currentBib}
                  onCopy={async () => {
                    await showHUD("Copied!");
                    await popToRoot();
                  }}
                />
              ) : (
                <Action title="Fetch BibTeX" onAction={() => fetchBib(doi)} />
              )}
            </ActionPanel>
          }
        />
      )}

      {history.length > 0 && (
        <List.Section title="Bibliography" subtitle="⌘⇧⌫ Clear · ⌘S Copy">
          {history.map((entry) => (
            <List.Item
              id={entry.doi}
              key={entry.doi}
              title={entry.doi}
              subtitle={relativeTime(entry.fetchedAt)}
              detail={<List.Item.Detail markdown={`\`\`\`bibtex\n${entry.bib}\n\`\`\``} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy BibTeX"
                    content={entry.bib}
                    onCopy={async () => {
                      await showHUD("Copied!");
                      await popToRoot();
                    }}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={clearHistory}
                  />
                  <Action.CopyToClipboard
                    title="Copy Bibliography"
                    content={history.map((e) => e.bib).join("\n\n")}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onCopy={async () => {
                      await showHUD("Copied!");
                      await popToRoot();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
