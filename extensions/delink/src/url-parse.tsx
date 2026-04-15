import { Action, ActionPanel, Clipboard, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HistoryList, UrlParamList } from "./components";
import { HistoryEntry, ParsedUrl, clearHistory, loadHistory, parseUrl, saveToHistory } from "./utils";

interface Preferences {
  allowedProtocols: string;
}

function getAllowedProtocols(): string[] {
  const { allowedProtocols } = getPreferenceValues<Preferences>();
  return allowedProtocols
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

// ─── Command ──────────────────────────────────────────────────────────────────

export default function Command() {
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const applyParsedUrl = useCallback(async (parsed: ParsedUrl) => {
    setParsedUrl(parsed);
    setShowHistory(false);
    await saveToHistory(parsed);
    setHistory(await loadHistory());
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
        return;
      }
      const parsed = parseUrl(clipboardText);
      if (!parsed) {
        await showToast({ style: Toast.Style.Failure, title: "No valid URL found in clipboard" });
        return;
      }
      await applyParsedUrl(parsed);
      await showToast({ style: Toast.Style.Success, title: "Parsed successfully", message: parsed.host });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to read clipboard" });
    }
  }, [applyParsedUrl]);

  const handleSelectHistoryEntry = useCallback(
    async (rawUrl: string) => {
      const parsed = parseUrl(rawUrl, getAllowedProtocols());
      if (!parsed) return;
      await applyParsedUrl(parsed);
      await showToast({ style: Toast.Style.Success, title: "Parsed from history", message: parsed.host });
    },
    [applyParsedUrl],
  );

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, []);

  useEffect(() => {
    async function init() {
      const savedHistory = await loadHistory();
      setHistory(savedHistory);

      if (savedHistory.length > 0) {
        // Show history list if there are previous entries and clipboard has no new URL
        const clipboardText = await Clipboard.readText();
        const parsed = clipboardText ? parseUrl(clipboardText, getAllowedProtocols()) : null;
        if (parsed) {
          await applyParsedUrl(parsed);
        } else {
          setShowHistory(true);
        }
      } else {
        await pasteFromClipboard();
      }
      setIsLoading(false);
    }
    init();
  }, [pasteFromClipboard, applyParsedUrl]);

  if (isLoading) {
    return <List isLoading />;
  }

  if (showHistory) {
    return (
      <HistoryList
        history={history}
        onSelectEntry={handleSelectHistoryEntry}
        onPasteFromClipboard={pasteFromClipboard}
        onClearHistory={handleClearHistory}
      />
    );
  }

  if (parsedUrl) {
    return (
      <UrlParamList
        parsedUrl={parsedUrl}
        onPasteFromClipboard={pasteFromClipboard}
        onShowHistory={() => setShowHistory(true)}
        onClearHistory={handleClearHistory}
      />
    );
  }

  return (
    <List>
      <List.EmptyView
        title="No URL found in clipboard"
        description="Copy a URL then press ⌘V to parse"
        actions={
          <ActionPanel>
            <Action
              title="Paste from Clipboard"
              onAction={pasteFromClipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
