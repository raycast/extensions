import { Action, ActionPanel, Clipboard, Detail, Icon, getPreferenceValues, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

const DEFAULT_WORDS_PER_MINUTE = 200;

type State = {
  loading: boolean;
  wordCount: number;
  minRead: string;
  subtitle: string;
  rawText: string;
  wpm: number;
};

export default function Command() {
  const { readingSpeed } = getPreferenceValues<Preferences.ClipboardReadingTime>();
  const configuredWpm = getWpmPreference(readingSpeed);

  const [state, setState] = useState<State>({
    loading: true,
    wordCount: 0,
    minRead: "0 min read",
    subtitle: "Reading clipboard…",
    rawText: "",
    wpm: configuredWpm,
  });

  useEffect(() => {
    void loadClipboard();
  }, []);

  async function loadClipboard() {
    try {
      const text = await Clipboard.readText();
      const safeText = (text ?? "").trim();
      const wordCount = countWords(safeText);
      const minRead = formatMinRead(wordCount, configuredWpm);

      setState({
        loading: false,
        wordCount,
        minRead,
        subtitle: safeText ? `${wordCount} words at ${configuredWpm} WPM` : "Clipboard is empty",
        rawText: safeText,
        wpm: configuredWpm,
      });
    } catch (error) {
      setState({
        loading: false,
        wordCount: 0,
        minRead: "0 min read",
        subtitle: error instanceof Error ? error.message : "Could not read clipboard",
        rawText: "",
        wpm: configuredWpm,
      });
    }
  }

  async function copyMinRead() {
    await Clipboard.copy(state.minRead);
    await showHUD(`Copied: ${state.minRead}`);
  }

  const markdown = state.rawText
    ? `# ${state.minRead}

**${state.wordCount} words** · Based on **${state.wpm} WPM**

---

${truncate(state.rawText, 3000)}`
    : `# ${state.minRead}

${state.subtitle}`;

  return (
    <Detail
      isLoading={state.loading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Output" text={state.minRead} />
          <Detail.Metadata.Label title="Words" text={String(state.wordCount)} />
          <Detail.Metadata.Label title="Speed" text={`${state.wpm} WPM`} />
          <Detail.Metadata.Label title="Status" text={state.subtitle} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Copy Min Read" icon={Icon.Clipboard} onAction={copyMinRead} />
          <Action.CopyToClipboard title="Copy Word Count" content={String(state.wordCount)} />
          <Action title="Refresh from Clipboard" icon={Icon.ArrowClockwise} onAction={loadClipboard} />
        </ActionPanel>
      }
    />
  );
}

function getWpmPreference(value?: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_WORDS_PER_MINUTE;
  return Math.round(parsed);
}

function countWords(input: string): number {
  if (!input) return 0;
  return input.split(/\s+/).filter(Boolean).length;
}

function formatMinRead(wordCount: number, wpm: number): string {
  if (wordCount <= 0) return "0 sec read";

  const totalSeconds = Math.ceil((wordCount / wpm) * 60);

  if (totalSeconds < 60) {
    return `${totalSeconds} sec read`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min read`;
  }

  return `${minutes} min ${seconds} sec read`;
}

function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength)}…`;
}
