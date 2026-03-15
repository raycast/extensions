import { Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { lookUpWord, detectProvider, providerLabel } from "./api/index";
import { getCached, setCached } from "./utils/cache";
import { DictionaryEntry, Preferences } from "./types";

interface Arguments {
  word: string;
}

function buildMarkdown(entry: DictionaryEntry | null, isLoading: boolean): string {
  if (isLoading) return "Looking up…";
  if (!entry) return "No definition found.";

  const examples = entry.examples.map((ex, i) => `${i + 1}. ${ex}`).join("\n");

  return `# ${entry.word}\n\n${entry.definition}\n\n---\n\n## Examples\n\n${examples}`;
}

function buildCopyText(entry: DictionaryEntry): string {
  return [
    `${entry.word} (${entry.partOfSpeech}) ${entry.phonetic}`,
    "",
    entry.definition,
    "",
    "Examples:",
    ...entry.examples.map((ex, i) => `${i + 1}. ${ex}`),
    "",
    `Synonyms: ${entry.synonyms.join(", ")}`,
  ].join("\n");
}

function formatCachedDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function Command(props: { arguments: Arguments }) {
  const { word } = props.arguments;
  const { apiKey } = getPreferenceValues<Preferences>();

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    async function fetchDefinition() {
      const cached = await getCached(word);
      if (cached) {
        setEntry(cached);
        setFromCache(true);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Success, title: "Loaded from cache" });
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: `Looking up "${word}"…` });
      try {
        const result = await lookUpWord(word, apiKey);
        await setCached(result);
        setEntry(result);
        await showToast({ style: Toast.Style.Success, title: "Done" });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to look up word",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDefinition();
  }, [word]);

  async function refetch() {
    setIsLoading(true);
    setFromCache(false);
    await showToast({ style: Toast.Style.Animated, title: `Re-fetching "${word}"…` });
    try {
      const result = await lookUpWord(word, apiKey);
      await setCached(result);
      setEntry(result);
      await showToast({ style: Toast.Style.Success, title: "Updated" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to re-fetch",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const provider = (() => {
    try {
      return detectProvider(apiKey);
    } catch {
      return null;
    }
  })();

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(entry, isLoading)}
      metadata={
        entry ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Pronunciation" text={entry.phonetic || "—"} />
            <Detail.Metadata.Label title="Part of Speech" text={entry.partOfSpeech || "—"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Synonyms">
              {entry.synonyms.map((s) => (
                <Detail.Metadata.TagList.Item key={s} text={s} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            {fromCache && (
              <Detail.Metadata.Label title="Cached" text={formatCachedDate(entry.cachedAt)} />
            )}
            <Detail.Metadata.Label
              title="Powered by"
              text={entry.provider ? providerLabel(entry.provider as "gemini" | "claude" | "openai") : "—"}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        entry ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Definition" content={buildCopyText(entry)} />
            {fromCache && (
              <Action
                title="Re-fetch from API"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refetch}
              />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
