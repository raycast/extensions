import { Action, ActionPanel, Color, Icon, List, openCommandPreferences } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { formatPercent, formatRelativeTime, formatReset, progressBar } from "./core/format";
import { FailureReason, ProviderOutcome, UsageResult, UsageWindow, effectiveUsedPercent } from "./core/models";
import { fetchAllUsage } from "./providers";

const WARN_AT = 75;
const DANGER_AT = 90;

function usageColor(percent: number): Color {
  if (percent >= DANGER_AT) return Color.Red;
  if (percent >= WARN_AT) return Color.Yellow;
  return Color.Green;
}

/**
 * The cache round-trips through JSON, which turns every Date into a string.
 * Reviving here keeps the rest of the UI working with real Dates.
 */
function reviveOutcomes(raw: ProviderOutcome[]): ProviderOutcome[] {
  return raw.map((outcome) => {
    if (!outcome.ok) return outcome;
    const result = outcome.result as UsageResult & { fetchedAt: string | Date };
    return {
      ok: true,
      result: {
        ...result,
        fetchedAt: new Date(result.fetchedAt),
        windows: result.windows.map((window) => ({
          ...window,
          resetsAt: window.resetsAt ? new Date(window.resetsAt as unknown as string) : null,
        })),
      },
    };
  });
}

function failureIcon(reason: FailureReason) {
  switch (reason) {
    case "not-installed":
      return { source: Icon.Minus, tintColor: Color.SecondaryText };
    case "network":
      return { source: Icon.WifiDisabled, tintColor: Color.Orange };
    default:
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  }
}

/**
 * Plain-text rendering for the clipboard, where no icon can travel. Here the
 * block-character bar earns its place: it is the only visual left.
 */
function summarize(outcomes: ProviderOutcome[], now: Date): string {
  return outcomes
    .map((outcome) => {
      if (!outcome.ok) return `${outcome.displayName}: ${outcome.detail}`;
      // Column width comes from the labels present, so a long per-model name
      // like "GPT-5.3-Codex-Spark" cannot break the alignment.
      const labelWidth = Math.max(...outcome.result.windows.map((window) => window.label.length));
      const rows = outcome.result.windows.map((window) => {
        const percent = effectiveUsedPercent(window, now);
        const label = window.label.padEnd(labelWidth);
        return `  ${label}  ${progressBar(percent)} ${formatPercent(percent).padStart(4)}  ${formatReset(window.resetsAt, now)}`;
      });
      return [outcome.result.displayName, ...rows].join("\n");
    })
    .join("\n\n");
}

export default function Command() {
  const [showScoped, setShowScoped] = useState(false);
  const { data, isLoading, revalidate } = useCachedPromise(async () => reviveOutcomes(await fetchAllUsage()), [], {
    initialData: [] as ProviderOutcome[],
    keepPreviousData: true,
  });

  const outcomes = data ?? [];
  const now = new Date();
  const hasAnyResult = outcomes.some((outcome) => outcome.ok);
  const hasScoped = outcomes.some((outcome) => outcome.ok && outcome.result.windows.some((w) => !w.isPrimary));

  const sharedActions = (
    <>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      {hasScoped && (
        <Action
          title="Toggle Model Limits"
          icon={showScoped ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => setShowScoped((value) => !value)}
        />
      )}
      <Action.CopyToClipboard
        title="Copy Summary"
        content={summarize(outcomes, now)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {/* No explicit shortcut: ⌘, is reserved by Raycast and already opens preferences. */}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
    </>
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && outcomes.length > 0 && !hasAnyResult && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No usage data available"
          description={outcomes.map((o) => (o.ok ? "" : `${o.displayName}: ${o.detail}`)).join("\n")}
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      )}

      {outcomes.map((outcome) =>
        outcome.ok ? (
          <ProviderSection
            key={outcome.result.provider}
            result={outcome.result}
            now={now}
            showScoped={showScoped}
            actions={sharedActions}
          />
        ) : (
          <List.Section key={outcome.provider} title={outcome.displayName}>
            <List.Item
              icon={failureIcon(outcome.reason)}
              title={outcome.detail}
              accessories={[{ text: outcome.reason === "not-installed" ? "not installed" : "unavailable" }]}
              actions={<ActionPanel>{sharedActions}</ActionPanel>}
            />
          </List.Section>
        ),
      )}
    </List>
  );
}

function ProviderSection({
  result,
  now,
  showScoped,
  actions,
}: {
  result: UsageResult;
  now: Date;
  showScoped: boolean;
  actions: ReactNode;
}) {
  const windows = result.windows.filter((window) => window.isPrimary || showScoped);
  const subtitle = [result.planType, `updated ${formatRelativeTime(result.fetchedAt, now)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <List.Section title={result.displayName} subtitle={subtitle}>
      {windows.map((window) => (
        <WindowItem key={window.id} window={window} now={now} actions={actions} />
      ))}
    </List.Section>
  );
}

function WindowItem({ window, now, actions }: { window: UsageWindow; now: Date; actions: ReactNode }) {
  const percent = effectiveUsedPercent(window, now);
  const color = usageColor(percent);
  const isReset = window.resetsAt !== null && window.usedPercent > 0 && percent === 0;

  return (
    <List.Item
      // A real progress ring reads far better at list density than block
      // characters, and carries the same severity colour.
      icon={getProgressIcon(percent / 100, color)}
      title={window.label}
      subtitle={isReset ? "just reset" : formatReset(window.resetsAt, now)}
      // The percentage repeats what the ring's colour conveys, so the state is
      // still legible without relying on colour alone.
      accessories={[{ tag: { value: formatPercent(percent), color } }]}
      actions={<ActionPanel>{actions}</ActionPanel>}
    />
  );
}
