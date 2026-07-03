import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  analyze,
  buildJson,
  buildReport,
  characterFrequency,
  formatBytes,
  formatDuration,
  quickSummary,
} from "./lib/text-analysis";

const fmt = (n: number) => n.toLocaleString();

/** Parse a words-per-minute preference, falling back when it's blank or not a positive number. */
function toWpm(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function Command() {
  const { readingSpeed, speakingSpeed } = getPreferenceValues<Preferences.TextAnalyzer>();
  const readingWpm = toWpm(readingSpeed, 200);
  const speakingWpm = toWpm(speakingSpeed, 130);

  const [text, setText] = useState("");

  // Prefill from the clipboard on open so "analyze what I just copied" is zero-friction.
  // Multiline content is preserved — it lives in form state, not a (single-line) search bar.
  useEffect(() => {
    (async () => {
      const clipboard = await Clipboard.readText();
      if (clipboard) setText(clipboard);
    })();
  }, []);

  const summary = useMemo(() => quickSummary(text, readingWpm), [text, readingWpm]);

  const summaryText =
    text === ""
      ? "Paste or type text above to analyze it."
      : [
          `Characters: ${fmt(summary.characters)}`,
          `Words: ${fmt(summary.words)}`,
          `Lines: ${fmt(summary.lines)}`,
          `Size: ${formatBytes(summary.bytes)}`,
          `Reading time: ${formatDuration(summary.readingSeconds)}`,
        ].join("   ·   ");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Show All Metrics"
            icon={Icon.BarChart}
            target={<MetricsList text={text} readingWpm={readingWpm} speakingWpm={speakingWpm} />}
          />
          <Action
            title="Reload from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => setText((await Clipboard.readText()) ?? "")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste or type text to analyze…"
        value={text}
        onChange={setText}
      />
      <Form.Description title="Summary" text={summaryText} />
    </Form>
  );
}

function MetricsList({ text, readingWpm, speakingWpm }: { text: string; readingWpm: number; speakingWpm: number }) {
  const analysis = useMemo(() => analyze(text, { readingWpm, speakingWpm }), [text, readingWpm, speakingWpm]);
  const report = useMemo(() => buildReport(analysis), [analysis]);
  const json = useMemo(() => buildJson(analysis), [analysis]);

  if (analysis.isEmpty) {
    return (
      <List navigationTitle="Text Metrics">
        <List.EmptyView
          icon={Icon.Text}
          title="Nothing to analyze"
          description="Go back and paste or type some text."
        />
      </List>
    );
  }

  // Export actions reachable from any row.
  const exportSection = (
    <ActionPanel.Section title="Export">
      <Action.CopyToClipboard title="Copy Full Report" icon={Icon.Document} content={report} />
      <Action.CopyToClipboard title="Copy as JSON" icon={Icon.Code} content={json} />
    </ActionPanel.Section>
  );

  const word = analysis.mostCommonWord;
  const char = analysis.mostCommonChar;

  return (
    <List navigationTitle="Text Metrics">
      <List.Section title="Counts">
        <Metric icon={Icon.Text} title="Characters" value={fmt(analysis.characters)} extra={exportSection} />
        <Metric
          icon={Icon.Text}
          title="Characters (no whitespace)"
          value={fmt(analysis.charactersNoWhitespace)}
          extra={exportSection}
        />
        <Metric icon={Icon.Paragraph} title="Words" value={fmt(analysis.words)} extra={exportSection} />
        <Metric icon={Icon.List} title="Lines" value={fmt(analysis.lines)} extra={exportSection} />
        <Metric icon={Icon.Dot} title="Sentences" value={fmt(analysis.sentences)} extra={exportSection} />
        <Metric icon={Icon.Paragraph} title="Paragraphs" value={fmt(analysis.paragraphs)} extra={exportSection} />
      </List.Section>

      <List.Section title="Size & Encoding">
        <Metric
          icon={Icon.HardDrive}
          title="Size (UTF-8)"
          value={formatBytes(analysis.bytes)}
          copy={String(analysis.bytes)}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Hashtag}
          title="Unicode code points"
          value={fmt(analysis.characters)}
          extra={exportSection}
        />
        <Metric icon={Icon.Hashtag} title="UTF-16 code units" value={fmt(analysis.utf16Units)} extra={exportSection} />
        <Metric icon={Icon.Hashtag} title="Grapheme clusters" value={fmt(analysis.graphemes)} extra={exportSection} />
        <Metric icon={Icon.Globe} title="Non-ASCII characters" value={fmt(analysis.nonAscii)} extra={exportSection} />
      </List.Section>

      <List.Section title="Readability & Timing">
        <Metric
          icon={Icon.Clock}
          title="Reading time"
          value={formatDuration(analysis.readingSeconds)}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Microphone}
          title="Speaking time"
          value={formatDuration(analysis.speakingSeconds)}
          extra={exportSection}
        />
        <Metric icon={Icon.Star} title="Unique words" value={fmt(analysis.uniqueWords)} extra={exportSection} />
        <Metric
          icon={Icon.Ruler}
          title="Average word length"
          value={analysis.avgWordLength.toFixed(1)}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Ruler}
          title="Average sentence length"
          value={`${analysis.avgSentenceLength.toFixed(1)} words`}
          copy={analysis.avgSentenceLength.toFixed(1)}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Text}
          title="Longest word"
          value={analysis.longestWord || "—"}
          copy={analysis.longestWord}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Ruler}
          title="Longest line length"
          value={fmt(analysis.longestLineLength)}
          extra={exportSection}
        />
      </List.Section>

      <List.Section title="Character Classes">
        <Metric icon={Icon.Lowercase} title="Letters" value={fmt(analysis.letters)} extra={exportSection} />
        <Metric icon={Icon.Hashtag} title="Digits" value={fmt(analysis.digits)} extra={exportSection} />
        <Metric icon={Icon.Dot} title="Punctuation" value={fmt(analysis.punctuation)} extra={exportSection} />
        <Metric icon={Icon.Minus} title="Whitespace" value={fmt(analysis.whitespace)} extra={exportSection} />
        <Metric icon={Icon.Uppercase} title="Uppercase letters" value={fmt(analysis.uppercase)} extra={exportSection} />
        <Metric icon={Icon.Lowercase} title="Lowercase letters" value={fmt(analysis.lowercase)} extra={exportSection} />
        <Metric
          icon={Icon.Star}
          title="Most common word"
          value={word ? `${word.value} (${word.count})` : "—"}
          copy={word?.value ?? ""}
          extra={exportSection}
        />
        <Metric
          icon={Icon.Star}
          title="Most common character"
          value={char ? `${char.value} (${char.count})` : "—"}
          copy={char?.value ?? ""}
          extra={exportSection}
        />
      </List.Section>

      <List.Section title="Distribution">
        <List.Item
          icon={Icon.BarChart}
          title="Character distribution"
          accessories={[{ text: "View →" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Character Distribution"
                icon={Icon.BarChart}
                target={<DistributionList text={text} />}
              />
              {exportSection}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function Metric({
  icon,
  title,
  value,
  copy,
  extra,
}: {
  icon: Icon;
  title: string;
  value: string;
  copy?: string;
  extra: ReactNode;
}) {
  return (
    <List.Item
      icon={icon}
      title={title}
      accessories={[{ text: value }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${title}`} content={copy ?? value} />
          {extra}
        </ActionPanel>
      }
    />
  );
}

function DistributionList({ text }: { text: string }) {
  const freq = useMemo(() => characterFrequency(text), [text]);

  return (
    <List navigationTitle="Character Distribution" searchBarPlaceholder="Filter characters…">
      {freq.length === 0 ? (
        <List.EmptyView icon={Icon.BarChart} title="No characters" />
      ) : (
        freq.map((f) => (
          <List.Item
            key={f.char}
            icon={Icon.Hashtag}
            title={f.label}
            keywords={[f.char]}
            accessories={[{ text: fmt(f.count) }, { text: `${f.percent}%` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Character" content={f.char} />
                <Action.CopyToClipboard title="Copy Count" content={String(f.count)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
