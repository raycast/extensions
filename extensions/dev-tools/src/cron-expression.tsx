import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { describe, describeFields, dayFieldsAreOr, nextRuns, parseCron } from "./lib/cron";

const EXAMPLES: { expr: string; label: string }[] = [
  { expr: "*/5 * * * *", label: "Every 5 minutes" },
  { expr: "0 9 * * 1-5", label: "Weekdays at 09:00" },
  { expr: "0 0 1 * *", label: "Midnight on the 1st of the month" },
  { expr: "30 2 * * 0", label: "Sundays at 02:30" },
  { expr: "0 */6 * * *", label: "Every 6 hours" },
  { expr: "0 0 13 * 5", label: "Friday the 13th rule (day-of-month OR day-of-week)" },
  { expr: "@daily", label: "Once a day at midnight (macro)" },
];

function formatAbsolute(d: Date, withSeconds: boolean): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(d);
}

function formatRelative(target: Date, now: Date): string {
  const diff = Math.round((target.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === "second") return rtf.format(Math.round(diff / secs), unit);
  }
  return "";
}

export default function Command() {
  const { defaultCount } = getPreferenceValues<Preferences.CronExpression>();
  const [searchText, setSearchText] = useState("");
  const [count, setCount] = useState(defaultCount);
  const [nonce, setNonce] = useState(0);

  // Prefill from the clipboard on open, but only if it parses as a cron expression.
  useEffect(() => {
    (async () => {
      const clip = (await Clipboard.readText())?.trim();
      if (!clip) return;
      try {
        parseCron(clip);
        setSearchText(clip);
      } catch {
        // Clipboard isn't a cron expression — leave the field empty.
      }
    })();
  }, []);

  const result = useMemo(() => {
    const expr = searchText.trim();
    if (!expr) return null;
    try {
      const parsed = parseCron(expr);
      const now = new Date();
      const runs = nextRuns(parsed, now, parseInt(count, 10));
      return {
        parsed,
        now,
        runs,
        summary: describe(parsed),
        fields: describeFields(parsed),
        isOr: dayFieldsAreOr(parsed),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
    // `nonce` is a manual-refresh trigger so "now" and the run list recompute on demand.
  }, [searchText, count, nonce]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a cron expression — e.g. */5 * * * *  or  0 9 * * 1-5"
      searchBarAccessory={
        <List.Dropdown tooltip="Upcoming runs to show" value={count} onChange={setCount}>
          <List.Dropdown.Item title="Next 5" value="5" />
          <List.Dropdown.Item title="Next 10" value="10" />
          <List.Dropdown.Item title="Next 25" value="25" />
        </List.Dropdown>
      }
    >
      {!result ? (
        <List.Section title="Examples">
          {EXAMPLES.map((ex) => (
            <List.Item
              key={ex.expr}
              icon={Icon.Clock}
              title={ex.expr}
              subtitle={ex.label}
              actions={
                <ActionPanel>
                  <Action title="Use This Expression" icon={Icon.ArrowRight} onAction={() => setSearchText(ex.expr)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : "error" in result ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Invalid cron expression"
          description={result.error}
        />
      ) : (
        <>
          <List.Section title="Schedule">
            <List.Item
              icon={Icon.Calendar}
              title={result.summary}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Description" content={result.summary} />
                  <Action.CopyToClipboard title="Copy Expression" content={result.parsed.normalized} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => setNonce((n) => n + 1)}
                  />
                </ActionPanel>
              }
            />
            {result.isOr && (
              <List.Item
                icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
                title="Day-of-month and day-of-week are both set"
                subtitle="Runs when EITHER matches — the standard cron rule"
              />
            )}
          </List.Section>

          <List.Section title="Fields">
            {result.fields.map((f) => (
              <List.Item
                key={f.label}
                icon={Icon.Hashtag}
                title={f.label}
                subtitle={f.description}
                accessories={[{ tag: f.expr }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Field" content={f.expr} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title={`Next ${result.runs.length} run${result.runs.length === 1 ? "" : "s"}`}>
            {result.runs.length === 0 ? (
              <List.Item icon={Icon.XMarkCircle} title="No upcoming runs within the next 6 years" />
            ) : (
              result.runs.map((d, i) => (
                <List.Item
                  key={i}
                  icon={Icon.Clock}
                  title={formatAbsolute(d, result.parsed.hasSeconds)}
                  accessories={[{ text: formatRelative(d, result.now) }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Time" content={formatAbsolute(d, result.parsed.hasSeconds)} />
                      <Action.CopyToClipboard title="Copy ISO 8601" content={d.toISOString()} />
                      <Action.CopyToClipboard
                        title="Copy All Upcoming"
                        content={result.runs.map((r) => formatAbsolute(r, result.parsed.hasSeconds)).join("\n")}
                      />
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
