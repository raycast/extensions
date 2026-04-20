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
import {
  HistoryEntry,
  looksLikeDoi,
  relativeTime,
  addToHistory,
  removeHistoryEntry,
  extractDoi,
  formatBib,
} from "./utils";

const STORAGE_KEY = "doi2bib-history";
/** Appended to the search placeholder when history exists (List has no plain-text right accessory). */
const SEARCH_BAR_COPY_HINT = "⌘S Save all";
export const FETCH_ITEM_ID = "fetch-item";

export function getSearchTransition({
  currentText,
  nextText,
  latestHistoryDoi,
}: {
  currentText: string;
  nextText: string;
  latestHistoryDoi?: string;
}) {
  const normalizedDoi = extractDoi(nextText);
  const shouldShowFetchItem = looksLikeDoi(normalizedDoi) && normalizedDoi !== latestHistoryDoi;

  return {
    normalizedDoi,
    shouldShowFetchItem,
    shouldClearCurrentBib: normalizedDoi !== extractDoi(currentText),
    nextSelectedItemId: shouldShowFetchItem ? FETCH_ITEM_ID : undefined,
  };
}

export function getSelectionOverrideAfterSelectionChange(
  currentOverrideId: string | undefined,
  actualSelectedItemId: string | null | undefined,
) {
  if (!currentOverrideId) {
    return undefined;
  }

  return actualSelectedItemId === currentOverrideId ? undefined : currentOverrideId;
}

export function getClipboardDoiToAutoFetch({
  clipboardText,
  lastAutoClipboardDoi,
}: {
  clipboardText: string;
  lastAutoClipboardDoi: string;
}) {
  const clipboardDoi = extractDoi(clipboardText ?? "");
  if (!looksLikeDoi(clipboardDoi) || clipboardDoi === lastAutoClipboardDoi) {
    return null;
  }

  return clipboardDoi;
}

/** After removing a history row, which list id should be selected. Fetch row wins whenever it is shown. */
export function getNextSelectionAfterRemoveFromHistory(
  updated: HistoryEntry[],
  removedIndex: number,
  searchNorm: string,
): string | undefined {
  const showFetchAfter = looksLikeDoi(searchNorm) && searchNorm !== updated[0]?.doi;
  if (showFetchAfter) {
    return FETCH_ITEM_ID;
  }
  if (updated.length > 0) {
    return updated[Math.min(removedIndex, updated.length - 1)].doi;
  }
  return undefined;
}

export default function Command() {
  const [doi, setDoi] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBib, setCurrentBib] = useState<string | null>(null);
  /** Bib preview in the Fetch row only when it was produced for the current search DOI. */
  const [bibForDoi, setBibForDoi] = useState<string | null>(null);
  const [selectionOverrideId, setSelectionOverrideId] = useState<string | undefined>();
  const lastAutoClipboardDoiRef = useRef("");
  const isApplyingClipboardRef = useRef(false);
  const fetchRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  async function applyClipboardDoi() {
    if (isApplyingClipboardRef.current) {
      return;
    }

    isApplyingClipboardRef.current = true;
    try {
      const { text } = await Clipboard.read();
      const clipboardDoi = getClipboardDoiToAutoFetch({
        clipboardText: text ?? "",
        lastAutoClipboardDoi: lastAutoClipboardDoiRef.current,
      });

      if (!clipboardDoi) {
        return;
      }

      lastAutoClipboardDoiRef.current = clipboardDoi;
      setCurrentBib(null);
      setBibForDoi(null);
      setSelectionOverrideId(FETCH_ITEM_ID);
      await fetchBib(clipboardDoi);
    } catch {
      // no clipboard access — skip
    } finally {
      isApplyingClipboardRef.current = false;
    }
  }

  function handleSearchTextChange(nextText: string) {
    const transition = getSearchTransition({
      currentText: doi,
      nextText,
      latestHistoryDoi: historyRef.current[0]?.doi,
    });

    setDoi(nextText);
    if (transition.shouldClearCurrentBib) {
      setCurrentBib(null);
      setBibForDoi(null);
    }
    setSelectionOverrideId(transition.nextSelectedItemId);
  }

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

      await applyClipboardDoi();
    }

    void init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void applyClipboardDoi();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function fetchBib(rawDoi: string) {
    const trimmed = extractDoi(rawDoi);
    setDoi(trimmed);
    fetchAbortControllerRef.current?.abort();
    const myRequestId = ++fetchRequestIdRef.current;
    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;
    const isCurrent = () => myRequestId === fetchRequestIdRef.current;

    setIsLoading(true);
    setCurrentBib(null);
    setBibForDoi(null);
    try {
      const response = await fetch(`https://doi.org/${trimmed}`, {
        headers: { Accept: "application/x-bibtex" },
        redirect: "follow",
        signal: controller.signal,
      });
      if (!isCurrent()) {
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bib = await response.text();
      if (!isCurrent()) {
        return;
      }
      if (!bib.trim()) {
        throw new Error("No BibTeX returned");
      }
      const formatted = formatBib(bib);
      if (!isCurrent()) {
        return;
      }
      setCurrentBib(formatted);
      setBibForDoi(trimmed);
      const entry: HistoryEntry = { doi: trimmed, bib: formatted, fetchedAt: new Date().toISOString() };
      const updated = addToHistory(historyRef.current, entry);
      historyRef.current = updated;
      setHistory(updated);
      setSelectionOverrideId(trimmed);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      if (!isCurrent()) {
        return;
      }
      const aborted = err instanceof Error && err.name === "AbortError";
      if (aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Fetch failed", message });
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }

  const normalizedDoi = extractDoi(doi);
  const showFetchItem = looksLikeDoi(normalizedDoi) && normalizedDoi !== history[0]?.doi;

  async function clearHistory() {
    await LocalStorage.removeItem(STORAGE_KEY);
    historyRef.current = [];
    setHistory([]);
    setCurrentBib(null);
    setBibForDoi(null);
    setSelectionOverrideId(undefined);
  }

  async function removeFromHistory(doiToRemove: string) {
    const prev = historyRef.current;
    const updated = removeHistoryEntry(prev, doiToRemove);
    if (updated.length === prev.length) {
      return;
    }
    const removedIndex = prev.findIndex((h) => h.doi === doiToRemove);
    historyRef.current = updated;
    setHistory(updated);

    // When selectionOverrideId is unset, Raycast keeps the selected row id internally.
    // Removing that row without moving selection leaves an invalid id and can dismiss the window.
    const searchNorm = extractDoi(doi);
    if (doiToRemove === searchNorm) {
      setCurrentBib(null);
      setBibForDoi(null);
    }
    const nextSelection = getNextSelectionAfterRemoveFromHistory(updated, removedIndex, searchNorm);
    setSelectionOverrideId(nextSelection);

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await showToast({ style: Toast.Style.Success, title: "Removed" });
  }

  return (
    <List
      selectedItemId={selectionOverrideId}
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchText={doi}
      onSearchTextChange={handleSearchTextChange}
      onSelectionChange={(itemId) =>
        setSelectionOverrideId((currentOverrideId) =>
          getSelectionOverrideAfterSelectionChange(currentOverrideId, itemId),
        )
      }
      searchBarPlaceholder={
        history.length > 0 ? `Paste or type a DOI…  ·  ${SEARCH_BAR_COPY_HINT}` : "Paste or type a DOI…"
      }
    >
      {showFetchItem && (
        <List.Item
          id={FETCH_ITEM_ID}
          title={`↩ Fetch: ${normalizedDoi}`}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              markdown={currentBib && bibForDoi === normalizedDoi ? `\`\`\`bibtex\n${currentBib}\n\`\`\`` : ""}
            />
          }
          actions={
            <ActionPanel>
              {currentBib && bibForDoi === normalizedDoi ? (
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
        <List.Section title="History" subtitle="⌘⌫ Remove · ⌘⇧⌫ Clear">
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
                    title="Remove from History"
                    icon={Icon.MinusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeFromHistory(entry.doi)}
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
