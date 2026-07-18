import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { classifyError, errorCategoryLabel, humanizeError, rewriteText } from "./gemini";
import {
  beginRetry,
  clearHistory,
  deleteHistoryEntry,
  getHistory,
  historyPolicy,
  markHistoryError,
  markHistorySuccess,
} from "./history";
import { profiles } from "./prompts";
import type { HistoryEntry } from "./types";

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function statusText(entry: HistoryEntry): string {
  if (entry.status === "success") return "Rewrite succeeded";
  if (entry.status === "pending") return "Processing, or the previous attempt was interrupted";
  return entry.errorCategory
    ? `Rewrite failed · ${errorCategoryLabel(entry.errorCategory)}`
    : "Rewrite failed";
}

function statusIcon(entry: HistoryEntry): { source: Icon; tintColor: Color } {
  if (entry.status === "success") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (entry.status === "pending") return { source: Icon.Clock, tintColor: Color.Yellow };
  return { source: Icon.ExclamationMark, tintColor: Color.Red };
}

function escapeMarkdown(text: string): string {
  const specialCharacters = new Set([
    "\\",
    "`",
    "*",
    "_",
    "{",
    "}",
    "[",
    "]",
    "<",
    ">",
    "#",
    "+",
    "-",
    ".",
    "!",
    "|",
  ]);
  return Array.from(text, (character) =>
    specialCharacters.has(character) ? `\\${character}` : character,
  ).join("");
}

function detailMarkdown(entry: HistoryEntry): string {
  const sections = [`## Original Chinese\n\n${escapeMarkdown(entry.sourceText)}`];

  if (entry.outputText) {
    sections.push(
      `## ${entry.status === "success" ? "English Result" : "Previous Successful Result"}\n\n${escapeMarkdown(entry.outputText)}`,
    );
  }

  if (entry.errorMessage) {
    sections.push(`## Latest Error\n\n${escapeMarkdown(entry.errorMessage)}`);
  }

  return sections.join("\n\n---\n\n");
}

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();

  async function reload() {
    setEntries(await getHistory());
  }

  useEffect(() => {
    reload()
      .catch((error) => {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: "Could not read local history" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const subtitle = useMemo(
    () =>
      `Stored locally · Up to ${historyPolicy.maxEntries} drafts · Removed after ${historyPolicy.retentionDays} days`,
    [],
  );

  async function copyText(text: string, title: string) {
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title });
  }

  async function retry(entry: HistoryEntry) {
    setBusyId(entry.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Rewriting…" });

    try {
      const pending = await beginRetry(entry);
      setEntries((current) => [pending, ...current.filter((item) => item.id !== entry.id)]);

      const output = await rewriteText(entry.sourceText, entry.mode);
      await markHistorySuccess(entry.id, output);
      await Clipboard.copy(output);
      await reload();

      toast.style = Toast.Style.Success;
      toast.title = "Rewrite succeeded and English was copied";
    } catch (error) {
      console.error("Gemini retry failed", classifyError(error));
      const message = humanizeError(error);

      try {
        await markHistoryError(entry.id, classifyError(error), message);
      } catch (historyError) {
        console.error("Failed to update retry error", historyError);
      }

      await Clipboard.copy(entry.sourceText);
      await reload();

      toast.style = Toast.Style.Failure;
      toast.title = "Rewrite failed and the original Chinese was copied";
      toast.message = message;
    } finally {
      setBusyId(undefined);
    }
  }

  async function remove(entry: HistoryEntry) {
    const confirmed = await confirmAlert({
      title: "Delete this draft?",
      message: "The original Chinese and English result will be removed from local history.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteHistoryEntry(entry.id);
    await reload();
  }

  async function removeAll() {
    const confirmed = await confirmAlert({
      title: "Clear all TweetCraft history?",
      message: "This cannot be undone. Your Gemini API key is not affected.",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await clearHistory();
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search original text or English results…"
    >
      <List.EmptyView
        icon={Icon.Document}
        title="No Local Drafts Yet"
        description={`Use tp, tpx, tps, or tpr and the draft will appear here. ${subtitle}.`}
      />

      {entries.map((entry) => {
        const isBusy = busyId === entry.id;
        const profile = profiles[entry.mode];

        return (
          <List.Item
            key={entry.id}
            icon={statusIcon(entry)}
            title={entry.sourceText.replace(/\s+/g, " ").trim()}
            subtitle={`${profile.label} · ${statusText(entry)}`}
            keywords={[entry.outputText ?? "", entry.errorMessage ?? "", profile.label]}
            accessories={[
              { text: `${entry.attempts} ${entry.attempts === 1 ? "attempt" : "attempts"}` },
              { text: formatTime(entry.updatedAt) },
            ]}
            detail={<List.Item.Detail markdown={detailMarkdown(entry)} />}
            actions={
              <ActionPanel>
                {entry.status === "success" && entry.outputText ? (
                  <Action
                    title="Copy English"
                    icon={Icon.CopyClipboard}
                    onAction={() => copyText(entry.outputText!, "English copied")}
                  />
                ) : (
                  <Action
                    title={isBusy ? "Rewriting…" : "Retry Rewrite"}
                    icon={Icon.ArrowClockwise}
                    onAction={() => retry(entry)}
                  />
                )}

                <Action
                  title="Copy Original Chinese"
                  icon={Icon.Clipboard}
                  onAction={() => copyText(entry.sourceText, "Original Chinese copied")}
                />

                {entry.status === "success" && (
                  <Action
                    title={isBusy ? "Rewriting…" : "Rewrite Again and Replace Result"}
                    icon={Icon.ArrowClockwise}
                    onAction={() => retry(entry)}
                  />
                )}

                {entry.outputText && entry.status !== "success" && (
                  <Action
                    title="Copy Previous Successful Result"
                    icon={Icon.CopyClipboard}
                    onAction={() => copyText(entry.outputText!, "Previous English result copied")}
                  />
                )}

                <ActionPanel.Section>
                  <Action
                    title="Delete Draft"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => remove(entry)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={removeAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
