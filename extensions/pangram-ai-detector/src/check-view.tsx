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

  const { data, error, isLoading } = usePromise(
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
            const shortNote = isTooShort ? `Pangram needs at least ${MIN_WORDS} words for a reliable result. ` : "";
            const confirmed = await confirmAlert({
              title: `Check ${words.toLocaleString()} words?`,
              message: `${shortNote}This costs about ${formatCost(words)} in Pangram credits.`,
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
          title: "Pangram model updated",
          message: `${previousModelVersion} → ${result.modelVersion}`,
        });
      },
      onError: (error) => {
        if (error instanceof Cancelled) popToRoot();
        else showCheckFailure(error, refresh);
      },
    },
  );

  const actions = (
    <ActionPanel>
      {data && <Action.CopyToClipboard title="Copy Verdict Summary" content={verdictSummary(data.result)} />}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action.OpenInBrowser title="Open API Dashboard" url={API_DASHBOARD_URL} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  if (isLoading || !data) {
    const markdown = isLoading ? (isSending ? "Checking…" : "") : `## Check failed\n\n${error?.message ?? ""}`;
    return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
  }

  const words = countWords(text.current ?? "");
  return (
    <Detail
      markdown={resultMarkdown(data.result)}
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
        <Detail.Metadata.TagList.Item text={result.verdict} color={verdictColors[result.verdict]} />
      </Detail.Metadata.TagList>
      {isLimitedConfidence && (
        <Detail.Metadata.TagList title="Confidence">
          <Detail.Metadata.TagList.Item text="Limited — short text" color={Color.Yellow} />
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.Label title="AI-Generated" text={percent(result.breakdown.ai)} icon={dot(Color.Red)} />
      <Detail.Metadata.Label title="AI-Assisted" text={percent(result.breakdown.aiAssisted)} icon={dot(Color.Orange)} />
      <Detail.Metadata.Label title="Human Written" text={percent(result.breakdown.human)} icon={dot(Color.Green)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Words" text={words.toLocaleString()} />
      <Detail.Metadata.Label title="Estimated Cost" text={formatCost(words)} />
      <Detail.Metadata.Label title="Model" text={`${model} · ${result.modelVersion}`} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Result">
        <Detail.Metadata.TagList.Item
          text={isCached ? "Cached" : "Fresh"}
          color={isCached ? Color.SecondaryText : Color.Green}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Checked" text={new Date(checkedAt).toLocaleString()} />
    </Detail.Metadata>
  );
}

/** Headline and summary, then each Segment's text under its label. */
function resultMarkdown(result: CheckResult): string {
  const segments = result.segments.map((segment) => {
    const tags = [`${segment.confidence} confidence`, ...(segment.isHumanized ? ["Humanized"] : [])];
    return `${segmentDots[segment.label]} **${segment.label}** · ${tags.join(" · ")}\n\n${segment.text.trim()}`;
  });
  return [`# ${result.headline}`, result.summary, "---", ...segments].join("\n\n");
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
      title: "Invalid Pangram API key",
      primaryAction: { title: "Open Extension Preferences", onAction: openExtensionPreferences },
    });
  }
  if (status === 402) {
    return showFailureToast(error, {
      title: "Out of Pangram credits",
      primaryAction: { title: "Open API Dashboard", onAction: () => open(API_DASHBOARD_URL) },
    });
  }
  return showFailureToast(error, { title: "Check failed", primaryAction: { title: "Try Again", onAction: retry } });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Estimate assuming Pangram bills per started 100 words. */
function formatCost(words: number): string {
  return `≈ $${(Math.ceil(words / 100) * USD_PER_100_WORDS).toFixed(2)}`;
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function dot(tintColor: Color) {
  return { source: Icon.CircleFilled, tintColor };
}

function positiveNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
