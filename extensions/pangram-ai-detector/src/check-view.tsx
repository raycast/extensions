import {
  Action,
  ActionPanel,
  Cache,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { runCheck, type CheckOutcome } from "./check";
import { PangramError, type CheckResult, type Segment, type Verdict } from "./pangram";

const API_DASHBOARD_URL = "https://www.pangram.com/apikey";
const USD_PER_100_WORDS = 0.05;
/** Pangram's documented minimum for a reliable result. */
const MIN_WORDS = 50;

const cache = new Cache();

const verdictColors: Record<Verdict, Color> = { AI: Color.Red, Mixed: Color.Orange, Human: Color.Green };
const segmentDots: Record<Segment["label"], string> = {
  "AI-Generated": "🔴",
  "AI-Assisted": "🟠",
  "Human Written": "🟢",
};

/** Thrown when the user declines the cost confirmation. */
class Cancelled extends Error {}

/** Shows the result of a Check on the text from one Source. */
export function CheckView({ readSource }: { readSource: () => Promise<string> }) {
  const preferences = getPreferenceValues<Preferences>();
  const confirmAboveWords = positiveNumber(preferences.confirmAboveWords, 2000);
  const limitedConfidenceBelowWords = positiveNumber(preferences.limitedConfidenceBelowWords, 200);
  const timeoutSeconds = positiveNumber(preferences.timeoutSeconds, 300);
  const text = useRef<string>(undefined);
  const [refreshes, setRefreshes] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const refresh = () => setRefreshes((count) => count + 1);

  const { data, error, isLoading, revalidate } = usePromise(
    async (refreshCount: number) => {
      setIsSending(false);
      text.current ??= await readSource();
      return runCheck(text.current, {
        apiKey: preferences.apiKey,
        model: preferences.model,
        timeoutMs: timeoutSeconds * 1000,
        versionInvalidatesCache: preferences.versionInvalidatesCache,
        refresh: refreshCount > 0,
        store: cache,
        beforeSend: async (sent) => {
          const words = countWords(sent);
          const isTooShort = words < MIN_WORDS;
          if (isTooShort || words > confirmAboveWords) {
            const shortNote = isTooShort ? `Pangram's results are less reliable below ${MIN_WORDS} words. ` : "";
            const confirmed = await confirmAlert({
              title: `Check about ${words.toLocaleString()} words?`,
              message: `${shortNote}This sends your text to Pangram and spends ${formatCost(words)} in prepaid credits.`,
              primaryAction: { title: "Check" },
            });
            if (!confirmed) throw new Cancelled();
          }
          setIsSending(true);
        },
      });
    },
    [refreshes],
    {
      onData: ({ previousModelVersion, result }) => {
        if (!previousModelVersion) return;
        showToast({
          style: Toast.Style.Success,
          title: "New Model Version detected",
          message: `${previousModelVersion} → ${result.modelVersion}`,
        });
      },
      onError: (error) => {
        if (error instanceof Cancelled) popToRoot();
        else showCheckFailure(error, revalidate);
      },
    },
  );

  const actions = (
    <ActionPanel>
      {data && <Action.CopyToClipboard title="Copy Verdict Summary" content={verdictSummary(data.result)} />}
      {!isLoading && (
        <Action
          title="Refresh (Spends Credits)"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      )}
      <Action.OpenInBrowser title="Open API Dashboard" url={API_DASHBOARD_URL} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  if (isLoading || !data) {
    const markdown = isLoading ? (isSending ? "Checking…" : "") : `## Check failed\n\n${error?.message ?? ""}`;
    return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
  }

  const words = data.result.segments.reduce((sum, segment) => sum + segment.wordCount, 0);
  return (
    <Detail
      navigationTitle={data.result.headline}
      markdown={resultMarkdown(data.result, preferences.literalSegmentText)}
      metadata={
        <ResultMetadata
          outcome={data}
          model={preferences.model}
          words={words}
          isLimitedConfidence={words < limitedConfidenceBelowWords}
        />
      }
      actions={actions}
    />
  );
}

function ResultMetadata({
  outcome,
  model,
  words,
  isLimitedConfidence,
}: {
  outcome: CheckOutcome;
  model: string;
  words: number;
  isLimitedConfidence: boolean;
}) {
  const { result, isCached, checkedAt } = outcome;
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Verdict">
        <Detail.Metadata.TagList.Item
          text={result.verdict === "AI" ? "AI-Generated" : result.verdict}
          color={verdictColors[result.verdict]}
        />
        {isLimitedConfidence && <Detail.Metadata.TagList.Item text="Short text" color={Color.Yellow} />}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Result" text={isCached ? "Cached · $0" : `New Check · ${formatCost(words)}`} />
      <Detail.Metadata.TagList title="Breakdown">
        <Detail.Metadata.TagList.Item text={`AI ${percent(result.breakdown.ai)}`} color={Color.Red} />
        <Detail.Metadata.TagList.Item text={`Assisted ${percent(result.breakdown.aiAssisted)}`} color={Color.Orange} />
        <Detail.Metadata.TagList.Item text={`Human ${percent(result.breakdown.human)}`} color={Color.Green} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Words (Pangram)" text={words.toLocaleString()} />
      <Detail.Metadata.Label title="Model" text={`${model} · ${result.modelVersion}`} />
      <Detail.Metadata.Label title="Checked" text={new Date(checkedAt).toLocaleString()} />
    </Detail.Metadata>
  );
}

/**
 * Each Segment's text under its label; the headline is the navigation title.
 * Multi-line Markdown (code fences, comments, math) can leak across Segments: https://github.com/mygirleatsmayo/pangram-raycast/issues/1
 */
function resultMarkdown(result: CheckResult, literalSegmentText: boolean): string {
  const segments = result.segments.map((segment) => {
    const tags = [`${segment.confidence} confidence`, ...(segment.isHumanized ? ["Humanized"] : [])];
    const text = segment.text.trim();
    const body = literalSegmentText ? codeBlock(text) : text;
    return `${segmentDots[segment.label]} **${segment.label}** · ${tags.join(" · ")}\n\n${body}`;
  });
  return segments.join("\n\n");
}

/** Fences text in a code block longer than any backtick run inside it, so it shows as written. */
function codeBlock(text: string): string {
  const fence = "`".repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)));
  return `${fence}\n${text}\n${fence}`;
}

function verdictSummary({ verdict, breakdown, modelVersion }: CheckResult): string {
  const parts = `${percent(breakdown.ai)} AI-Generated, ${percent(breakdown.aiAssisted)} AI-Assisted, ${percent(breakdown.human)} Human Written`;
  return `${verdict}: ${parts} (Pangram ${modelVersion})`;
}

/** Failure toast with the fix that matches the error. */
function showCheckFailure(error: Error, retry: () => void) {
  const status = error instanceof PangramError ? error.status : undefined;
  if (status === 401) {
    return showFailureToast(error, {
      title: "Missing or invalid Pangram API key",
      primaryAction: { title: "Open Extension Preferences", onAction: openExtensionPreferences },
    });
  }
  if (status === 402) {
    return showFailureToast(error, {
      title: "Not enough Pangram credits",
      primaryAction: { title: "Open API Dashboard", onAction: () => open(API_DASHBOARD_URL) },
    });
  }
  return showFailureToast(error, { title: "Check failed", primaryAction: { title: "Try Again", onAction: retry } });
}

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

/** Word estimate before sending; segments by locale rules, so text without spaces (e.g. Chinese) counts too. */
function countWords(text: string): number {
  return [...wordSegmenter.segment(text)].filter((segment) => segment.isWordLike).length;
}

/** Estimate assuming Pangram bills per started 100 words. */
function formatCost(words: number): string {
  return `≈ $${(Math.ceil(words / 100) * USD_PER_100_WORDS).toFixed(2)}`;
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function positiveNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
