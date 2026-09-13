import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  getSelectedText,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { countText, CountResult, formatReadingTime } from "./count";
import { useModelPricing, formatCost, formatContextUsage, FALLBACK_CONTEXT_WINDOWS } from "./pricing";

interface Preferences {
  preferSelectedText: boolean;
  showTokenCounts: boolean;
  showReadingTime: boolean;
  showCostEstimates: boolean;
}

type TextSource = "selection" | "clipboard";

interface LoadedText {
  text: string;
  source: TextSource;
}

const formatNumber = (num: number) => num.toLocaleString();

export default function CountText() {
  const preferences = getPreferenceValues<Preferences>();
  const [loaded, setLoaded] = useState<LoadedText | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadText() {
    setIsLoading(true);
    try {
      if (preferences.preferSelectedText) {
        try {
          const selection = await getSelectedText();
          if (selection && selection.trim().length > 0) {
            setLoaded({ text: selection, source: "selection" });
            setIsLoading(false);
            return;
          }
        } catch {
          // No selection or the frontmost app doesn't support it — fall through to clipboard
        }
      }
      const clipboardText = await Clipboard.readText();
      if (!clipboardText || clipboardText.trim().length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text found",
          message: "Select some text or copy it to the clipboard first",
        });
        setLoaded(null);
        setIsLoading(false);
        return;
      }
      setLoaded({ text: clipboardText, source: "clipboard" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read text",
        message: String(error),
      });
      setLoaded(null);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadText();
  }, []);

  const counts = useMemo(() => (loaded ? countText(loaded.text) : null), [loaded?.text]);
  const pricing = useModelPricing(preferences.showCostEstimates && preferences.showTokenCounts);

  async function copyResult(value: string | number, label: string) {
    await Clipboard.copy(String(value));
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${label}`,
      message: `${value} copied to clipboard`,
    });
  }

  function RefreshAction() {
    return (
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadText}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );
  }

  if (isLoading && !loaded) {
    return <Detail isLoading={true} />;
  }

  if (!loaded || !counts) {
    return (
      <Detail
        markdown="# No text found\n\nSelect some text in any app or copy it to the clipboard, then press ⌘R."
        actions={
          <ActionPanel>
            <RefreshAction />
          </ActionPanel>
        }
      />
    );
  }

  const stats: Array<{
    id: string;
    title: string;
    icon: Icon;
    value: string;
    copyValue: string | number;
    label: string;
  }> = [
    {
      id: "words",
      title: "Words",
      icon: Icon.Text,
      value: `${formatNumber(counts.words)} words`,
      copyValue: counts.words,
      label: "words count",
    },
    {
      id: "characters",
      title: "Characters",
      icon: Icon.Document,
      value: `${formatNumber(counts.characters)} chars`,
      copyValue: counts.characters,
      label: "characters count",
    },
    {
      id: "charactersNoSpaces",
      title: "Characters (no spaces)",
      icon: Icon.TextInput,
      value: `${formatNumber(counts.charactersNoSpaces)} chars`,
      copyValue: counts.charactersNoSpaces,
      label: "characters (no spaces) count",
    },
    {
      id: "lines",
      title: "Lines",
      icon: Icon.TextCursor,
      value: `${formatNumber(counts.lines)} lines`,
      copyValue: counts.lines,
      label: "lines count",
    },
    {
      id: "sentences",
      title: "Sentences",
      icon: Icon.Dot,
      value: `${formatNumber(counts.sentences)} sentences`,
      copyValue: counts.sentences,
      label: "sentences count",
    },
    {
      id: "paragraphs",
      title: "Paragraphs",
      icon: Icon.Paragraph,
      value: `${formatNumber(counts.paragraphs)} paragraphs`,
      copyValue: counts.paragraphs,
      label: "paragraphs count",
    },
    ...(preferences.showReadingTime
      ? [
          {
            id: "readingTime",
            title: "Reading Time",
            icon: Icon.Clock,
            value: formatReadingTime(counts.readingTimeMinutes),
            copyValue: formatReadingTime(counts.readingTimeMinutes),
            label: "reading time",
          },
        ]
      : []),
  ];

  const tokenRows: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: Icon;
    tokens: number;
    contextWindow: number;
    costPerMTok?: number;
    label: string;
  }> = [
    {
      id: "o200k",
      title: "GPT-4o / o-series",
      subtitle: "o200k_base",
      icon: Icon.Bolt,
      tokens: counts.tokensO200k,
      contextWindow: pricing?.o200k.contextWindow ?? FALLBACK_CONTEXT_WINDOWS.o200k,
      costPerMTok: pricing?.o200k.inputCostPerMTok,
      label: "GPT-4o tokens count",
    },
    {
      id: "cl100k",
      title: "GPT-4 / GPT-3.5",
      subtitle: "cl100k_base",
      icon: Icon.Stars,
      tokens: counts.tokensCl100k,
      contextWindow: FALLBACK_CONTEXT_WINDOWS.o200k,
      label: "GPT-4 tokens count",
    },
    {
      id: "claude",
      title: "Claude (~estimate)",
      subtitle: "tokenizer not public",
      icon: Icon.Star,
      tokens: counts.tokensClaudeEstimate,
      contextWindow: pricing?.claude.contextWindow ?? FALLBACK_CONTEXT_WINDOWS.claude,
      costPerMTok: pricing?.claude.inputCostPerMTok,
      label: "Claude tokens count",
    },
  ];

  const previewText = loaded.text.trim().replace(/\s+/g, " ").slice(0, 80);
  const sourceLabel = loaded.source === "selection" ? "Selected text" : "Clipboard";

  return (
    <List isLoading={isLoading}>
      <List.Section title="Analyzed Text">
        <List.Item
          title={previewText}
          icon={Icon.QuoteBlock}
          accessories={[{ tag: sourceLabel }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Analyzed Text"
                icon={Icon.Clipboard}
                onAction={() => copyResult(loaded.text, "analyzed text")}
              />
              <RefreshAction />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Text Statistics">
        {stats.map((stat) => (
          <List.Item
            key={stat.id}
            title={stat.title}
            icon={stat.icon}
            accessories={[{ text: stat.value }]}
            actions={
              <ActionPanel>
                <Action
                  title={`Copy ${stat.title}`}
                  icon={Icon.Clipboard}
                  onAction={() => copyResult(stat.copyValue, stat.label)}
                />
                <RefreshAction />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {preferences.showTokenCounts && (
        <List.Section title="Token Counts">
          {tokenRows.map((row) => (
            <List.Item
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              icon={row.icon}
              accessories={[
                ...(preferences.showCostEstimates && row.costPerMTok !== undefined
                  ? [{ tag: `${formatCost(row.tokens, row.costPerMTok)} input` }]
                  : []),
                { text: formatContextUsage(row.tokens, row.contextWindow) },
                { text: `${formatNumber(row.tokens)} tokens` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Copy ${row.title} Tokens`}
                    icon={Icon.Clipboard}
                    onAction={() => copyResult(row.tokens, row.label)}
                  />
                  <RefreshAction />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Actions">
        <List.Item
          title="Copy All Statistics"
          subtitle="as plain text, Markdown, or JSON"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Copy as Plain Text"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(buildPlainTextSummary(counts));
                  await showToast({ style: Toast.Style.Success, title: "Copied all statistics" });
                }}
              />
              <Action
                title="Copy as Markdown Table"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(buildMarkdownSummary(counts));
                  await showToast({ style: Toast.Style.Success, title: "Copied as Markdown" });
                }}
              />
              <Action
                title="Copy as JSON"
                icon={Icon.CodeBlock}
                onAction={async () => {
                  await Clipboard.copy(buildJsonSummary(counts));
                  await showToast({ style: Toast.Style.Success, title: "Copied as JSON" });
                }}
              />
              <RefreshAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function summaryEntries(counts: CountResult): Array<[string, string | number]> {
  return [
    ["Words", counts.words],
    ["Characters", counts.characters],
    ["Characters (no spaces)", counts.charactersNoSpaces],
    ["Lines", counts.lines],
    ["Sentences", counts.sentences],
    ["Paragraphs", counts.paragraphs],
    ["Reading time", formatReadingTime(counts.readingTimeMinutes)],
    ["Tokens (o200k_base, GPT-4o)", counts.tokensO200k],
    ["Tokens (cl100k_base, GPT-4)", counts.tokensCl100k],
    ["Tokens (Claude, estimate)", counts.tokensClaudeEstimate],
  ];
}

function buildPlainTextSummary(counts: CountResult): string {
  return summaryEntries(counts)
    .map(([label, value]) => `${label}: ${typeof value === "number" ? formatNumber(value) : value}`)
    .join("\n");
}

function buildMarkdownSummary(counts: CountResult): string {
  const rows = summaryEntries(counts)
    .map(([label, value]) => `| ${label} | ${typeof value === "number" ? formatNumber(value) : value} |`)
    .join("\n");
  return `| Statistic | Value |\n| --- | --- |\n${rows}`;
}

function buildJsonSummary(counts: CountResult): string {
  return JSON.stringify(
    {
      words: counts.words,
      characters: counts.characters,
      charactersNoSpaces: counts.charactersNoSpaces,
      lines: counts.lines,
      sentences: counts.sentences,
      paragraphs: counts.paragraphs,
      readingTimeMinutes: Number(counts.readingTimeMinutes.toFixed(2)),
      tokens: {
        o200k_base: counts.tokensO200k,
        cl100k_base: counts.tokensCl100k,
        claudeEstimate: counts.tokensClaudeEstimate,
      },
    },
    null,
    2,
  );
}
