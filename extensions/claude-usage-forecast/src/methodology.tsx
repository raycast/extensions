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
  const todayKey = localDate(now);
  const values: Array<{
    label: string;
    actual: number;
    proj: number;
    today: boolean;
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
      today: key === todayKey,
      weekend: dow === 0 || dow === 6,
    });
  }
  const max = Math.max(1, ...values.map((v) => v.actual + v.proj));

  rows.push("| Day | Used % | Projected % | |");
  rows.push("| --- | --- | --- | --- |");
  for (const v of values) {
    const total = v.actual + v.proj;
    const label = v.today ? `**${v.label}**` : v.label;
    rows.push(
      `| ${label}${v.weekend ? " ·" : ""} | ${v.actual > 0.05 ? v.actual.toFixed(1) : "–"} | ${v.proj > 0.05 ? v.proj.toFixed(1) : "–"} | \`${bar(total, max)}\` |`,
    );
  }
  return rows.join("\n");
}

/**
 * Learned weight per weekday, Monday-first — the JS Sunday-first index reads oddly.
 * The relative column compares against the heaviest weekday *average*, not against
 * any single day you actually had; that ceiling is the day cap, shown under Today.
 */
function patternTable(f: Forecast): string {
  const max = Math.max(...f.dowProfile, 0.0001);
  const today = new Date().getDay();
  const rows = [
    "| Weekday | Weight | Share of heaviest | |",
    "| --- | --- | --- | --- |",
  ];
  for (const i of [1, 2, 3, 4, 5, 6, 0]) {
    const rel = f.dowProfile[i] / max;
    const name = i === today ? `**${DOW_NAMES[i]}** (today)` : DOW_NAMES[i];
    rows.push(
      `| ${name} | ${f.dowProfile[i].toFixed(2)} | ${(rel * 100).toFixed(0)}% | \`${bar(f.dowProfile[i], max)}\` |`,
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

/**
 * A day weight in whatever unit is meaningful: percent once calibrated, else raw
 * cost. Every weight here describes *today*, so today's own rate converts them —
 * the same factor the projection charges the rest of today at.
 */
function weight(f: Forecast, x: number): string {
  const k = f.kToday ?? f.k;
  return k === null ? `$${x.toFixed(2)}` : `${(x * k).toFixed(1)}%`;
}

/**
 * The four weights that decide how much today is expected to add. This is the part
 * of the model that moves between two refreshes, so it leads the view.
 */
function todayTable(f: Forecast): string {
  const rows = [
    "| | Full-day weight | Where it comes from |",
    "| --- | --- | --- |",
    `| Weekday prior | ${weight(f, f.todayPrior)} | ${DOW_NAMES[new Date().getDay()]} averaged over ${f.profileDays} days before this window |`,
  ];

  rows.push(
    f.todayPaced === null
      ? `| Today's own pace | — | ${f.k === null ? "not calibrated this window" : "under 2% of a usual day elapsed — too early to read"} |`
      : `| Today's own pace | ${weight(f, f.todayPaced)} | $${f.todayActual.toFixed(2)} spent ÷ ${(f.elapsedMass * 100).toFixed(0)}% of a usual day elapsed |`,
  );

  const shift = f.todayPrior > 0.05 ? f.todayIntensity / f.todayPrior : null;
  const shiftNote =
    shift === null
      ? ""
      : ` · ${shift >= 1 ? "×" : "÷"}${(shift >= 1 ? shift : 1 / shift).toFixed(2)} off the prior`;
  rows.push(
    f.todayPaced === null
      ? `| **Live estimate** | **${weight(f, f.todayIntensity)}** | the prior, uncorrected |`
      : f.todayPrior > 0.05
        ? `| **Live estimate** | **${weight(f, f.todayIntensity)}** | prior and pace blended, pace carrying ${(f.todayWeight * 100).toFixed(0)}%${shiftNote} |`
        : `| **Live estimate** | **${weight(f, f.todayIntensity)}** | no prior to blend against, so the pace alone, scaled to ${(f.todayWeight * 100).toFixed(0)}% |`,
  );

  rows.push(
    f.dayCap === null
      ? "| Day ceiling | — | too few active days in history to bound one |"
      : f.todayCap !== null && f.todayCap > f.dayCap * 1.001
        ? `| Day ceiling | ${weight(f, f.todayCap)} | raised from ${weight(f, f.dayCap)} — today already spent more |`
        : `| Day ceiling | ${weight(f, f.dayCap)} | 90th percentile of your active days, plus 15% |`,
  );

  return rows.join("\n");
}

export function methodologyMarkdown(f: Forecast): string {
  // `null` means "omit this block"; `""` is a real blank line and must survive the
  // filter, or every paragraph below collapses into one.
  const blocks: Array<string | null> = [
    "# How the forecast is built",
    "",
    "## Today",
    "",
    "The weekday table further down is only a starting guess. Almost all of the movement between two refreshes comes from the four numbers here, so they lead.",
    "",
    todayTable(f),
    "",
    f.todayPaced === null
      ? "**The correction is not running yet**, so the live estimate above is just the weekday prior. Here is what it does once it has something to work with."
      : null,
    "",
    "Today is re-classified by its own pace: what you have already spent, divided by the share of a usual day that has already elapsed, gives the full-day weight today is really tracking toward. That pace is blended with the weekday prior geometrically, and its share of the blend grows as the day fills up — it passes half around **mid-morning**, once 15% of a usual day's usage has elapsed. Early on, one burst barely moves the forecast; by lunchtime your own pace is in charge.",
    "",
    "So a quiet Wednesday that turns intensive is forecast as an intensive day within the hour, and a normally busy day that stays idle stops predicting a busy day. Two guards keep that from running away: while there is a prior to blend against, the result can never land more than 25× above or below it, and either way it is capped by the day ceiling.",
    "",
    f.todayPrior > 0.05
      ? null
      : "Today is the exception to that first guard: this weekday is normally idle, so there is no prior worth blending against and no ratio to bound. The estimate is the pace alone, scaled down by how little of the day it has seen — a deliberately conservative read, because a single early burst on a normally-dead day is weak evidence.",
    "",
    f.dayCap === null
      ? "There is no day ceiling yet — too few active days in history to say what a heavy day of yours weighs."
      : `The day ceiling bounds today *and* every future day. It is the recency-weighted 90th percentile of the days that saw any usage, plus 15% headroom; with fewer than five active days on record it falls back to your single heaviest day plus the same headroom. Today can be told it looks like your heaviest kind of day, never like a day you have never had — except upward, when today has already outspent the ceiling, since that is evidence rather than noise.`,
    "",
    "### The rest of the week",
    "",
    f.weekDaysDone === 0
      ? "No day in this window has finished yet, so the days after today still use their weekday priors unadjusted."
      : `The same correction runs one level up, from the **${f.weekDaysDone} completed day${f.weekDaysDone === 1 ? "" : "s"}** in this window only — today is excluded so its shift is never counted twice. Every day *after* today has its weekday prior multiplied by **×${f.weekFactor.toFixed(2)}** (clamped to the 0.25–4× range, then still subject to the day ceiling). A week that has been running hot keeps running hot.`,
    "",
    "## This week, day by day",
    "",
    "Used is reconstructed from local transcripts and pinned to the real percentage; projected is what the model expects that day to add. Today is **bold**, weekend days are marked `·`.",
    "",
    dayTable(f),
    "",
    "**Real** is the weekly percentage from Anthropic's usage endpoint — the same number Claude Code shows. It is the only ground truth here, and it is sampled every time the menu bar refreshes. The solid line on the graph is that percentage, with its shape between samples reconstructed from local transcripts.",
    "",
    "**Forecast** is the dashed line from now to reset. It is not a straight trend: each future hour gets the usage your own history says that hour of day usually sees, scaled by how heavy the day it belongs to now looks.",
    "",
    "## Calibration",
    "",
    "The two sources use different units — an opaque model-weighted budget versus token counts. Instead of guessing the budget size, a factor is fitted inside the current window:",
    "",
    "```",
    "k = weekly % now / local cost so far this window",
    "```",
    "",
    f.k === null
      ? "Not calibrated yet this window, so the forecast stays flat and the weights above are shown as raw cost."
      : `Currently **${f.k.toFixed(2)} % per $**, from $${f.costSoFar.toFixed(2)} of local activity. Projected hours are converted to percent the same way, so the absolute cost model never matters — only relative sizes do.`,
    "",
    f.k === null
      ? null
      : "That single number has a catch. The cost model is a proxy, and its %-per-$ genuinely wanders several-fold from one day to the next. Fitted across the whole window it folds in today's in-flight cost, so a heavy morning would drag k down and quietly shrink **Friday's** forecast along with it. The forecast for a day you have not reached yet should not move because of what you did this morning, so the fit is split in two:",
    "",
    f.k === null
      ? null
      : [
          "| Used for | Fitted on | Rate |",
          "| --- | --- | --- |",
          `| Days after today | the completed days of this window | ${f.kBase === null ? "—" : `**${f.kBase.toFixed(3)} % per $**`}${f.costBeforeToday > 0.05 ? ` · ${f.pctToday === null ? "" : `${(f.pctNow - f.pctToday).toFixed(0)}% over `}$${f.costBeforeToday.toFixed(2)}` : ""} |`,
          `| The rest of today | today alone | ${f.kToday === null ? "—" : `**${f.kToday.toFixed(3)} % per $**`}${f.pctToday === null ? "" : ` · ${f.pctToday.toFixed(0)}% over $${f.todayActual.toFixed(2)}`} |`,
        ].join("\n"),
    "",
    f.k === null
      ? null
      : "The baseline rate only re-fits at midnight, when today closes and becomes evidence, so the rest of the week holds a steady trajectory through the day. Today's own rate is what the API has actually charged you for today's work, which keeps the end-of-day landing honest even when today burns budget at a different rate than the week did. Neither is allowed more than 4× away from the window-wide k, and until today has moved at least 3 percentage points — whole percents are all the API reports, so less than that is mostly rounding — today borrows the baseline rate rather than reading noise.",
    "",
    "## The weekday prior",
    "",
    `Every calendar day in the ${f.profileDays} days before this window is bucketed by weekday, including days with zero usage — a quiet Sunday is signal, not a gap. Days are weighted by age with a **21-day half-life**, so habits from three weeks ago count half as much as this week's. Once a weekday has 5+ observations its single largest day is dropped, so one runaway session cannot define your Tuesdays.`,
    "",
    "This is the prior the live correction above overrides for today, and scales for the days after it. Weights are relative, so read the shape rather than the numbers.",
    "",
    patternTable(f),
    "",
    "## The hour shape",
    "",
    "The same history gives a normalized 24-hour shape, applied on top of the day weight. That is what makes the crossing time an hour rather than a date, and it is also the yardstick for “how much of a usual day has elapsed” above.",
    "",
    hourTable(f),
    "",
    "## Limits of this",
    "",
    "- Transcripts only cover work done on this machine. Usage from the web app, other devices, or other Claude Code installs shows in the real percentage but not in the pattern.",
    "- The window's own days never feed the weekday and hour profiles. They only drive the live corrections above, which reset with the window.",
    "- A brand-new habit takes about a week to move the weekday weights — but a single unusual day is picked up the same day by the live correction.",
    "- The live correction assumes the day's *shape* is normal even when its size is not. A day that is heavy only because you started six hours earlier than usual reads as a heavier day than it will turn out to be.",
    "- With no usable hour history at all, the 24-hour shape falls back to flat — every hour equally likely — which spreads the forecast evenly instead of concentrating it in your working hours.",
    "",
    f.warnings.length > 0
      ? `## Active caveats\n\n${f.warnings.map((w) => `- ${w}`).join("\n")}`
      : null,
  ];
  return (
    blocks
      .filter((x): x is string => x !== null)
      .join("\n")
      // Omitted blocks leave their blank-line neighbours behind; collapse the gap.
      .replace(/\n{3,}/g, "\n\n")
  );
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

  // Retained data is expired once `load` rejects, so never prefer it.
  if (error) {
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
