import {
  Detail,
  List,
  Clipboard,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Color,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import * as fs from "node:fs";
import * as path from "node:path";
import { startOAuthFlow, storeTokens, clearTokens, getValidToken } from "./lib/oauth";
import { checkGrammar, isGeminiModel } from "./lib/api";
import { addHistoryEntry, getHistory, clearHistory, HistoryEntry } from "./lib/history";
import { log } from "./lib/log";

// --- Mock Mode ---
// Create a .mock file in the project root to enable mock API responses.
// Usage: touch .mock && bun run dev (remove with: rm .mock)

function isMockMode(): boolean {
  try {
    const mockPath = path.join(__dirname, ".mock");
    return fs.existsSync(mockPath);
  } catch {
    return false;
  }
}

// --- Helpers ---

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function charCount(text: string): number {
  return text.length;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

interface DiffResult {
  markdown: string;
  corrections: number;
}

export const MAX_DIFF_WORDS = 2000;

export function computeDiff(original: string, corrected: string): DiffResult {
  const oldWords = original.split(/(\s+)/);
  const newWords = corrected.split(/(\s+)/);

  // Skip diff for very long texts to avoid O(m*n) memory issues
  if (oldWords.length > MAX_DIFF_WORDS || newWords.length > MAX_DIFF_WORDS) {
    return { markdown: corrected, corrections: 1 };
  }

  // LCS-based word diff
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = m,
    j = n;
  const stack: Array<{ type: "keep" | "del" | "add"; text: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      stack.push({ type: "keep", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "add", text: newWords[j - 1] });
      j--;
    } else {
      stack.push({ type: "del", text: oldWords[i - 1] });
      i--;
    }
  }

  stack.reverse();

  // Count corrections (groups of consecutive del/add with non-whitespace)
  let corrections = 0;
  let inChange = false;
  for (const item of stack) {
    if (item.type !== "keep" && item.text.trim()) {
      if (!inChange) {
        corrections++;
        inChange = true;
      }
    } else {
      inChange = false;
    }
  }

  // Build inline text
  const parts: string[] = [];
  for (const item of stack) {
    if (item.type === "keep") {
      parts.push(item.text);
    } else if (item.type === "del") {
      if (item.text.trim()) parts.push(` ~~${item.text.trim()}~~ `);
    } else {
      if (item.text.trim()) parts.push(` **${item.text.trim()}** `);
      else parts.push(item.text);
    }
  }

  return {
    markdown: parts.join("").replace(/  +/g, " "),
    corrections,
  };
}

const ASCII_TITLE =
  "\u2588\u2580\u2580 \u2588\u2591\u2588 \u2588\u2580\u2580 \u2588\u2580\u2580 \u2588\u2584\u2580 \u2588 \u2588\u2584\u2591\u2588 \u2588\u2580\u2580   \u2588\u2580\u2580 \u2588\u2580\u2588 \u2584\u2580\u2588 \u2588\u2580\u2584\u2580\u2588 \u2588\u2580\u2584\u2580\u2588 \u2584\u2580\u2588 \u2588\u2580\u2588\n" +
  "\u2588\u2584\u2584 \u2588\u2580\u2588 \u2588\u2588\u2584 \u2588\u2584\u2584 \u2588\u2591\u2588 \u2588 \u2588\u2591\u2580\u2588 \u2588\u2584\u2588   \u2588\u2584\u2588 \u2588\u2580\u2584 \u2588\u2580\u2588 \u2588\u2591\u2580\u2591\u2588 \u2588\u2591\u2580\u2591\u2588 \u2588\u2580\u2588 \u2588\u2580\u2584";

const BAR_WIDTH = ASCII_TITLE.split("\n")[0].length;

function buildMarkdown(
  original: string,
  result: string | null,
  isLoading: boolean,
  frame: number,
  elapsed: number,
): { md: string; corrections: number } {
  if (isLoading) {
    const blockSize = 12;
    const travel = BAR_WIDTH - blockSize;
    const pos = frame % (travel * 2);
    const actualPos = pos < travel ? pos : travel * 2 - pos;
    const bar = Array.from({ length: BAR_WIDTH }, (_, i) =>
      i >= actualPos && i < actualPos + blockSize ? "\u2588" : "\u2591",
    ).join("");
    let preview = "";
    if (original) {
      const maxWidth = BAR_WIDTH - 4; // 2 for "| " and 2 for " |"
      const words = original.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        if (line && (line + " " + word).length > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = line ? line + " " + word : word;
        }
      }
      if (line) lines.push(line);

      const top = "\u250C" + "\u2500".repeat(BAR_WIDTH - 2) + "\u2510";
      const bot = "\u2514" + "\u2500".repeat(BAR_WIDTH - 2) + "\u2518";
      const empty = "\u2502" + " ".repeat(BAR_WIDTH - 2) + "\u2502";
      const boxLines = lines.map((l) => {
        const padded = l + " ".repeat(Math.max(0, BAR_WIDTH - 4 - l.length));
        return `\u2502 ${padded} \u2502`;
      });
      preview = `\n${top}\n${empty}\n${boxLines.join("\n")}\n${empty}\n${bot}`;
    }
    const timerText = formatDuration(elapsed);
    const timerPadded = " ".repeat(Math.max(0, BAR_WIDTH - timerText.length)) + timerText;
    return {
      md: `\`\`\`\n${ASCII_TITLE}\n\n${bar}\n${timerPadded}${preview}\n\`\`\``,
      corrections: 0,
    };
  }
  if (!result)
    return {
      md: "*No text in clipboard.* Copy some text and try again.",
      corrections: 0,
    };

  if (result.trim() === original.trim()) {
    return {
      md: "### No issues found\n\nYour text looks good.\n\n---\n\n" + original,
      corrections: 0,
    };
  }

  const diff = computeDiff(original, result);

  return {
    md: "### Corrected\n\n" + result + "\n\n---\n\n### Changes\n\n" + diff.markdown,
    corrections: diff.corrections,
  };
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

// --- Component ---

export default function CheckGrammar() {
  const prefs = getPreferenceValues<Preferences>();
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);
  const spinnerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<number>(0);

  const useGemini = isGeminiModel(prefs.model);

  useEffect(() => {
    if (isMockMode()) {
      log("Mock mode enabled");
      setToken("debug");
      setAuthChecked(true);
    } else if (useGemini) {
      setToken(prefs.geminiApiKey || null);
      setAuthChecked(true);
    } else {
      getValidToken().then((t) => {
        setToken(t);
        setAuthChecked(true);
      });
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      timerStartRef.current = Date.now();
      spinnerRef.current = setInterval(() => {
        setSpinnerFrame((f) => f + 1);
        setElapsedMs(Date.now() - timerStartRef.current);
      }, 150);
    } else if (spinnerRef.current) {
      setFinalElapsedMs(Date.now() - timerStartRef.current);
      clearInterval(spinnerRef.current);
      spinnerRef.current = null;
    }
    return () => {
      if (spinnerRef.current) clearInterval(spinnerRef.current);
    };
  }, [isLoading]);

  const loadHistory = useCallback(async () => {
    const entries = await getHistory();
    setHistory(entries);
  }, []);

  const signIn = useCallback(async () => {
    if (useGemini) {
      // Gemini uses API key, open settings
      openExtensionPreferences();
      return;
    }
    setIsAuthenticating(true);
    log("Sign in started (OpenAI)");
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Signing in...",
        message: "Complete login in browser, then return here",
      });
      const tokens = await startOAuthFlow();
      await storeTokens(tokens);
      setToken(tokens.accessToken);
      log("Sign in complete, tokens stored");
      await showToast({ style: Toast.Style.Success, title: "Signed in!" });
    } catch (error) {
      log(`Sign in failed: ${error}`);
      const msg = String(error);
      if (msg.includes("timed out") || msg.includes("ECONNREFUSED")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Sign in failed",
          message: "Try again quickly. Don't close Raycast while signing in.",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Sign in failed",
          message: String(error),
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [useGemini]);

  const signOut = useCallback(async () => {
    await clearTokens();
    setToken(null);
    setResult(null);
    setOriginal("");
    await showToast({ style: Toast.Style.Success, title: "Signed out" });
  }, []);

  const run = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setResult(null);

    try {
      const clipContent = await Clipboard.read();
      if (clipContent.file) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard contains a file, not text",
        });
        setIsLoading(false);
        return;
      }
      const text = clipContent.text;
      if (!text?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard is empty",
        });
        setIsLoading(false);
        return;
      }

      setOriginal(text);

      let corrected: string;
      if (isMockMode()) {
        log("Mock mode: returning mock response (1.5s delay)");
        await new Promise((r) => setTimeout(r, 1500));
        corrected =
          text.charAt(0).toUpperCase() + text.slice(1).replace(/\s+/g, " ").trim() + (text.endsWith(".") ? "" : ".");
      } else {
        corrected = await checkGrammar({
          text,
          token: token!,
          geminiApiKey: prefs.geminiApiKey,
          model: prefs.model,
          prompt: prefs.prompt,
        });
      }
      setResult(corrected);
      await addHistoryEntry(text, corrected);

      await showToast({
        style: Toast.Style.Success,
        title: "Grammar check completed",
      });
    } catch (error) {
      const msg = String(error);
      if (msg.includes("401")) {
        await clearTokens();
        setToken(null);
        await showToast({
          style: Toast.Style.Failure,
          title: "Session expired, please sign in again",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Grammar check failed",
          message: msg,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && authChecked) run();
    if (!token && authChecked) setIsLoading(false);
  }, [token, authChecked, run]);

  // --- Not authenticated ---
  if (authChecked && !token) {
    const loginMarkdown = isAuthenticating
      ? `# Signing in...\n\nA browser window has opened for you to log in.\n\nComplete the login quickly and return here.\n\n*Keep Raycast open in the background while signing in.*`
      : useGemini
        ? [
            "# Grammar Checker",
            "",
            "Fix grammar, spelling, and punctuation in your clipboard text using Gemini.",
            "",
            "---",
            "",
            "### Gemini API Key Required",
            "",
            "1. Press **Enter** to open Settings",
            "2. Paste your Gemini API key (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))",
            "3. Copy any text and run this command",
          ].join("\n")
        : [
            "# Grammar Checker",
            "",
            "Fix grammar, spelling, and punctuation in your clipboard text using OpenAI.",
            "",
            "---",
            "",
            "### Getting Started",
            "",
            "1. Press **Enter** to sign in with your OpenAI account",
            "2. Copy any text to your clipboard",
            "3. Run this command to see corrections",
            "",
            "---",
            "",
            "*Requires a ChatGPT Plus or Pro account. No API key needed.*",
          ].join("\n");

    return (
      <Detail
        isLoading={isAuthenticating}
        markdown={loginMarkdown}
        actions={
          !isAuthenticating ? (
            <ActionPanel>
              <Action
                title={useGemini ? "Open Settings" : "Sign in with OpenAI"}
                icon={useGemini ? Icon.Gear : Icon.PersonCircle}
                onAction={signIn}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  // --- History detail view ---
  if (selectedEntry) {
    const entry = selectedEntry;
    const entryMarkdown = entry.hadChanges
      ? "### Corrected\n\n" + entry.corrected + "\n\n---\n\n### Original\n\n" + entry.original
      : "### No issues found\n\n" + entry.original;

    return (
      <Detail
        markdown={entryMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              {entry.hadChanges ? (
                <Detail.Metadata.TagList.Item text="Corrected" color={Color.Orange} />
              ) : (
                <Detail.Metadata.TagList.Item text="No issues" color={Color.Green} />
              )}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Words" text={String(wordCount(entry.original))} />
            <Detail.Metadata.Label title="When" text={timeAgo(entry.timestamp)} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Corrected Text" content={entry.corrected} icon={Icon.Clipboard} />
            <Action.Paste title="Paste Corrected Text" content={entry.corrected} icon={Icon.Document} />
            <Action
              title="Back to History"
              icon={Icon.ArrowLeft}
              onAction={() => setSelectedEntry(null)}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // --- History list view ---
  if (showHistory) {
    return (
      <List>
        {history.length === 0 ? (
          <List.EmptyView title="No history yet" description="Grammar checks will appear here." icon={Icon.Clock} />
        ) : (
          history.map((entry) => (
            <List.Item
              key={entry.id}
              title={truncate(entry.original.replace(/\n/g, " "), 60)}
              subtitle={timeAgo(entry.timestamp)}
              icon={{
                source: Icon.Dot,
                tintColor: entry.hadChanges ? Color.Orange : Color.Green,
              }}
              accessories={[{ text: `${wordCount(entry.original)} words` }]}
              actions={
                <ActionPanel>
                  <Action title="View Details" icon={Icon.Eye} onAction={() => setSelectedEntry(entry)} />
                  <Action.CopyToClipboard title="Copy Corrected Text" content={entry.corrected} icon={Icon.Clipboard} />
                  <Action
                    title="Back to Result"
                    icon={Icon.ArrowLeft}
                    onAction={() => setShowHistory(false)}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await clearHistory();
                      setHistory([]);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "History cleared",
                      });
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  // --- Main result view ---
  const { md: markdown, corrections } = buildMarkdown(original, result, isLoading, spinnerFrame, elapsedMs);
  const hasChanges = corrections > 0;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !isLoading && result ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              {hasChanges ? (
                <Detail.Metadata.TagList.Item
                  text={`${corrections} correction${corrections === 1 ? "" : "s"}`}
                  color={Color.Orange}
                />
              ) : (
                <Detail.Metadata.TagList.Item text="No issues" color={Color.Green} />
              )}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Words" text={String(wordCount(original))} />
            <Detail.Metadata.Label title="Characters" text={String(charCount(original))} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Model" text={prefs.model} />
            <Detail.Metadata.Label title="Time" text={formatDuration(finalElapsedMs)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {!isLoading && result && (
            <>
              <Action.CopyToClipboard title="Copy Corrected Text" content={result} icon={Icon.Clipboard} />
              <Action.Paste title="Paste Corrected Text" content={result} icon={Icon.Document} />
            </>
          )}
          <Action
            title="Re-Check Clipboard"
            icon={Icon.ArrowClockwise}
            onAction={run}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="View History"
            icon={Icon.Clock}
            onAction={async () => {
              await loadHistory();
              setShowHistory(true);
            }}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          <Action
            title="Settings"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
          <Action
            title="Sign out"
            icon={Icon.Logout}
            onAction={signOut}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
