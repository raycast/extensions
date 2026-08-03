import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { bar } from "./lib/chart";
import { DOW_NAMES } from "./lib/forecast";
import { localDate } from "./lib/jsonl";
import { load } from "./lib/load";
import { Forecast } from "./lib/types";

/**
 * Metadata rows cannot push a view, so the link opens this command instead.
 * Must match the author + extension + command names in package.json.
 */
export const METHODOLOGY_DEEPLINK =
  "raycast://extensions/vinri2z/claude-usage-forecast/methodology";

/** Per-day view of the current window: what actually happened, then what is expected. */
function dayTable(f: Forecast): string {
  const rows: string[] = [];
  const now = Date.now();
  const day = 86_400_000;

  // Cost per day inside the window, reconstructed from the actual curve.
  const perDay = new Map<string, number>();
  for (let i = 1; i < f.actual.length; i++) {
    const d = localDate(f.actual[i - 1].t);
    perDay.set(
      d,
      (perDay.get(d) ?? 0) + (f.actual[i].pct - f.actual[i - 1].pct),
    );
  }
  const projPerDay = new Map<string, number>();
  for (let i = 1; i < f.projected.length; i++) {
    const d = localDate(f.projected[i - 1].t);
    projPerDay.set(
      d,
      (projPerDay.get(d) ?? 0) + (f.projected[i].pct - f.projected[i - 1].pct),
    );
  }

  const start = new Date(f.windowStart);
  start.setHours(0, 0, 0, 0);
  const values: Array<{
    label: string;
    actual: number;
    proj: number;
    future: boolean;
    weekend: boolean;
  }> = [];
  for (let t = start.getTime(); t < f.windowEnd; t += day) {
    const d = new Date(t);
    const key = localDate(t);
    const dow = d.getDay();
    values.push({
      label: `${DOW_NAMES[dow]} ${String(d.getDate()).padStart(2, "0")}`,
      actual: perDay.get(key) ?? 0,
      proj: projPerDay.get(key) ?? 0,
      future: t + day <= now ? false : true,
      weekend: dow === 0 || dow === 6,
    });
  }
  const max = Math.max(1, ...values.map((v) => v.actual + v.proj));

  rows.push("| Day | Used % | Projected % | |");
  rows.push("| --- | --- | --- | --- |");
  for (const v of values) {
    const total = v.actual + v.proj;
    rows.push(
      `| ${v.label}${v.weekend ? " ·" : ""} | ${v.actual > 0.05 ? v.actual.toFixed(1) : "–"} | ${v.proj > 0.05 ? v.proj.toFixed(1) : "–"} | \`${bar(total, max)}\` |`,
    );
  }
  return rows.join("\n");
}

/** Learned weight per weekday, Monday-first — the JS Sunday-first index reads oddly. */
function patternTable(f: Forecast): string {
  const max = Math.max(...f.dowProfile, 0.0001);
  const rows = [
    "| Weekday | Weight | Share of a peak day | |",
    "| --- | --- | --- | --- |",
  ];
  for (const i of [1, 2, 3, 4, 5, 6, 0]) {
    const rel = f.dowProfile[i] / max;
    rows.push(
      `| ${DOW_NAMES[i]} | ${f.dowProfile[i].toFixed(2)} | ${(rel * 100).toFixed(0)}% | \`${bar(f.dowProfile[i], max)}\` |`,
    );
  }
  return rows.join("\n");
}

/** Busiest hours, so the intra-day shape of the forecast is inspectable. */
function hourTable(f: Forecast): string {
  const max = Math.max(...f.hourProfile, 0.0001);
  const top = f.hourProfile
    .map((w, h) => ({ h, w }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 6)
    .sort((a, b) => a.h - b.h);
  const rows = ["| Hour | Share of a day | |", "| --- | --- | --- |"];
  for (const { h, w } of top) {
    rows.push(
      `| ${String(h).padStart(2, "0")}:00 | ${(w * 100).toFixed(1)}% | \`${bar(w, max)}\` |`,
    );
  }
  return rows.join("\n");
}

export function methodologyMarkdown(f: Forecast): string {
  return [
    "# How the forecast is built",
    "",
    "### This week, day by day",
    "",
    "Used is reconstructed from local transcripts and pinned to the real percentage; projected is what the model expects that day to add. Weekend days are marked `·`.",
    "",
    dayTable(f),
    "",
    "### Real vs forecast",
    "",
    "**Real** is the weekly percentage from Anthropic's usage endpoint — the same number Claude Code shows. It is the only ground truth here, and it is sampled every time the menu bar refreshes. The solid line is that percentage, with its shape between samples reconstructed from local transcripts.",
    "",
    "**Forecast** is the dashed line from now to reset. It is not a straight trend: each future hour gets the usage your own history says that weekday and that hour of day usually see.",
    "",
    "### Calibration",
    "",
    "The two sources use different units — an opaque model-weighted budget versus token counts. Instead of guessing the budget size, one factor is fitted inside the current window:",
    "",
    "```",
    "k = weekly % now / local cost so far this window",
    "```",
    "",
    f.k === null
      ? "Not calibrated yet this window, so the forecast stays flat."
      : `Currently **${f.k.toFixed(2)} % per $**, from $${f.costSoFar.toFixed(2)} of local activity. Projected hours are converted to percent with the same k, so the absolute cost model never matters — only relative sizes do.`,
    "",
    "### Learning, per day",
    "",
    `Every calendar day in the last ${f.profileDays} days before this window is bucketed by weekday, including days with zero usage — a quiet Sunday is signal, not a gap. Days are weighted by age with a **21-day half-life**, so habits from three weeks ago count half as much as this week's. Once a weekday has 5+ observations its single largest day is dropped, so one runaway session cannot define your Tuesdays.`,
    "",
    patternTable(f),
    "",
    "### Learning, per hour",
    "",
    "The same history gives a normalized 24-hour shape, applied on top of the weekday weight. That is what makes the crossing time an hour rather than a date.",
    "",
    hourTable(f),
    "",
    "### Limits of this",
    "",
    "- Transcripts only cover work done on this machine. Usage from the web app, other devices, or other Claude Code installs shows in the real percentage but not in the pattern.",
    "- The window's own days are excluded from learning, so today's behaviour never predicts itself.",
    "- A brand-new habit takes about a week to move the weights.",
    "",
    f.warnings.length > 0
      ? `### Active caveats\n\n${f.warnings.map((w) => `- ${w}`).join("\n")}`
      : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
}

/** Pushed from the usage graph, where the forecast is already loaded. */
export function Methodology({ f }: { f: Forecast }) {
  return <Detail markdown={methodologyMarkdown(f)} />;
}

/** Standalone command, so the menu bar and the metadata link can reach it too. */
export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(load, [], {
    keepPreviousData: true,
  });

  if (error && !data) {
    return (
      <Detail
        markdown={`# Cannot read Claude usage\n\n\`\`\`\n${error.message}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return <Detail isLoading markdown="Reading Claude usage…" />;

  return (
    <Detail
      isLoading={isLoading}
      markdown={methodologyMarkdown(data.forecast)}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
