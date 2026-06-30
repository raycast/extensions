import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getCcusageActiveBlock,
  getThisWeekUsage,
  type CcusageResult,
  type CcusageWeekResult,
} from "./lib/ccusage";
import {
  readStatuslineCache,
  type LimitWindow,
  type StatuslineCache,
} from "./lib/statusline-cache";
import {
  installStatuslineCapture,
  manualSnippet,
  statuslineScriptPath,
  uninstallStatuslineCapture,
  type InstallResult,
} from "./lib/statusline-installer";
import { settingsJsonPath, statusLineSnippet } from "./lib/claude-settings";
import {
  countdown,
  formatCost,
  formatNumber,
  formatPercent,
  formatResetMoment,
  modelFamilyColor,
  shortModelName,
  thresholdColor,
} from "./lib/format";
import { limitCardImage } from "./lib/svg";

async function onLoadError(err: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn’t refresh session usage",
    message: err instanceof Error ? err.message : String(err),
  });
}

export default function Command() {
  // Three independent sources, loaded separately so the FAST one never waits on
  // the slow ones. The hero gauges come from the statusline cache (a ~1ms file
  // read); the secondary block/week numbers come from ccusage (a CLI scan of
  // the local logs, ~0.1–2s). Loading them as one Promise.all would block the
  // gauges behind the slowest call — the main source of the laggy feel.
  const cacheState = useCachedPromise(readStatuslineCache, [], {
    keepPreviousData: true,
    onError: onLoadError,
  });
  const cache = cacheState.data;

  // ccusage scans only matter once the cache is configured; defer them until
  // then so the one-time setup screen never spawns the CLI. `week` is the
  // slowest call (full weekly scan) and feeds only the side panel, so it gets
  // its own hook and never holds up the active-block line.
  const configured = cache?.configured === true;
  const blockState = useCachedPromise(getCcusageActiveBlock, [], {
    keepPreviousData: true,
    execute: configured,
    onError: onLoadError,
  });
  const weekState = useCachedPromise(getThisWeekUsage, [], {
    keepPreviousData: true,
    execute: configured,
    onError: onLoadError,
  });

  const ccusage = blockState.data;
  const week = weekState.data;
  const isLoading =
    cacheState.isLoading || blockState.isLoading || weekState.isLoading;
  const revalidate = () => {
    cacheState.revalidate();
    if (configured) {
      blockState.revalidate();
      weekState.revalidate();
    }
  };

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  // Setup state: no usable cache yet.
  if (cache && !cache.configured) {
    return <SetupView cache={cache} refreshAction={refreshAction} />;
  }

  const markdown =
    cache && cache.configured
      ? renderMarkdown(cache, ccusage)
      : renderLoading();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        cache && cache.configured
          ? renderMetadata(cache, ccusage, week)
          : undefined
      }
      actions={
        <ActionPanel>
          {refreshAction}
          {cache && cache.configured ? (
            <Action.CopyToClipboard
              title="Copy Raw Rate Limits"
              icon={Icon.CodeBlock}
              shortcut={Keyboard.Shortcut.Common.Copy}
              content={JSON.stringify(cache.rawRateLimits, null, 2)}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Status Line Snippet"
            icon={Icon.Terminal}
            content={manualSnippet()}
          />
          <Action
            title="Uninstall Status Line Capture"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const result = await uninstallStatuslineCapture();
              if (result.status === "removed") {
                await showToast({
                  style: Toast.Style.Success,
                  title: "Capture block removed",
                });
              } else if (result.status === "not-installed") {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Nothing to remove",
                });
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Uninstall failed",
                  message: result.message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function renderLoading(): string {
  return "# Claude Session\n\nLoading subscription usage…";
}

function renderMarkdown(
  cache: Extract<StatuslineCache, { configured: true }>,
  ccusage: CcusageResult | undefined,
): string {
  const now = new Date();
  const lines: string[] = [];

  // Plain-text header — always readable even if the hero images fail to render.
  lines.push("# Claude Session");
  lines.push("");
  const captured =
    cache.ageMs != null && cache.ageMs > 0
      ? ` · captured ${countdown(cache.ageMs)} ago`
      : "";
  lines.push(`_${now.toLocaleString()}${captured}_`);
  lines.push("");

  // Heroes: the reset countdowns, rendered as big SVG cards.
  lines.push(
    limitCardImage(
      {
        label: "5-Hour",
        countdown: countdownFor(cache.fiveHour, now),
        percentUsed: cache.fiveHour.percentUsed,
        caption: limitCaption(cache.fiveHour),
      },
      // Encode the live values into the alt so Raycast treats it as a new image
      // when they change (avoids a stale cached card vs. the live side panel).
      `5-hour ${formatPercent(cache.fiveHour.percentUsed)} ${countdownFor(cache.fiveHour, now)}`,
    ),
  );
  lines.push("");
  lines.push(
    limitCardImage(
      {
        label: "7-Day",
        countdown: countdownFor(cache.sevenDay, now),
        percentUsed: cache.sevenDay.percentUsed,
        caption: limitCaption(cache.sevenDay),
      },
      `7-day ${formatPercent(cache.sevenDay.percentUsed)} ${countdownFor(cache.sevenDay, now)}`,
    ),
  );
  lines.push("");

  // Secondary: compact active-block summary (full breakdown lives in the panel).
  lines.push("**Active 5-Hour Block**");
  lines.push("");
  lines.push(...activeBlockBodyLines(ccusage));

  return lines.join("\n");
}

/** Hero countdown text for a window: `1h 48m`, `now`, or `—` when unknown. */
function countdownFor(window: LimitWindow, now: Date): string {
  if (!window.resetsAt) return "—";
  return countdown(window.resetsAt.getTime() - now.getTime());
}

/** Caption such as `resets 2:30 PM` — the percent is now a hero inside the card. */
function limitCaption(window: LimitWindow): string {
  return window.resetsAt
    ? `resets ${formatResetMoment(window.resetsAt)}`
    : "reset time unavailable";
}

/** Compact, secondary active-block lines for the body. */
function activeBlockBodyLines(ccusage: CcusageResult | undefined): string[] {
  if (!ccusage) return ["_Loading token details from ccusage…_"];
  if (!ccusage.ok) return [`⚠️ ${ccusage.message}`];
  if (!ccusage.block) {
    return [
      "_No active block right now — start a Claude Code session to see live token usage._",
    ];
  }

  const b = ccusage.block;
  const prefs = getPreferenceValues<Preferences>();
  const approx = prefs.currency === "KRW" ? " _(approx.)_" : "";

  const summary = [
    `${formatNumber(b.tokens.total)} tokens`,
    `${formatCost(b.costUSD, prefs)}${approx}`,
  ];
  if (b.burnRate.tokensPerMinute != null) {
    summary.push(`${formatNumber(b.burnRate.tokensPerMinute)} tok/min`);
  }

  const lines = [summary.join(" · "), ""];
  lines.push(
    b.projection.remainingMinutes != null
      ? `_~${countdown(b.projection.remainingMinutes * 60_000)} of runway at this rate · full breakdown in the side panel →_`
      : "_Full breakdown in the side panel →_",
  );
  return lines;
}

/** Format a ccusage week-start date (`2026-06-29`) as `Jun 29`. */
function formatWeekOf(period: string | null): string {
  if (!period) return "this week";
  const d = new Date(`${period}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? period
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderMetadata(
  cache: Extract<StatuslineCache, { configured: true }>,
  ccusage: CcusageResult | undefined,
  week: CcusageWeekResult | undefined,
): React.ReactNode {
  const now = new Date();
  const prefs = getPreferenceValues<Preferences>();
  const five = cache.fiveHour;
  const seven = cache.sevenDay;
  const block = ccusage && ccusage.ok ? ccusage.block : null;
  const approx = prefs.currency === "KRW" ? " (approx.)" : "";

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Local Time"
        text={now.toLocaleTimeString()}
      />
      <Detail.Metadata.Separator />

      {five.resetsAt ? (
        <Detail.Metadata.Label
          title="5h Resets In"
          text={countdown(five.resetsAt.getTime() - now.getTime())}
          icon={{
            source: Icon.Clock,
            tintColor: thresholdColor(five.percentUsed),
          }}
        />
      ) : null}
      {five.resetsAt ? (
        <Detail.Metadata.Label
          title="5h Reset At"
          text={formatResetMoment(five.resetsAt)}
        />
      ) : null}

      <Detail.Metadata.Separator />
      {seven.resetsAt ? (
        <Detail.Metadata.Label
          title="7d Resets In"
          text={countdown(seven.resetsAt.getTime() - now.getTime())}
          icon={{
            source: Icon.Clock,
            tintColor: thresholdColor(seven.percentUsed),
          }}
        />
      ) : null}
      {seven.resetsAt ? (
        <Detail.Metadata.Label
          title="7d Reset At"
          text={formatResetMoment(seven.resetsAt)}
        />
      ) : null}

      {block ? (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Block Tokens"
            text={formatNumber(block.tokens.total)}
            icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Label
            title="Input"
            text={formatNumber(block.tokens.input)}
          />
          <Detail.Metadata.Label
            title="Output"
            text={formatNumber(block.tokens.output)}
          />
          <Detail.Metadata.Label
            title="Cache Create"
            text={formatNumber(block.tokens.cacheCreate)}
          />
          <Detail.Metadata.Label
            title="Cache Read"
            text={formatNumber(block.tokens.cacheRead)}
          />
          <Detail.Metadata.Label
            title="Block Cost"
            text={`${formatCost(block.costUSD, prefs)}${approx}`}
          />
          {block.burnRate.tokensPerMinute != null ? (
            <Detail.Metadata.Label
              title="Burn Rate"
              text={`${formatNumber(block.burnRate.tokensPerMinute)} tok/min`}
            />
          ) : null}
          {block.burnRate.costPerHour != null ? (
            <Detail.Metadata.Label
              title="Cost / Hour"
              text={`${formatCost(block.burnRate.costPerHour, prefs)}${approx}`}
            />
          ) : null}
          {block.endTime ? (
            <Detail.Metadata.Label
              title="Block Resets In"
              text={countdown(block.endTime.getTime() - now.getTime())}
            />
          ) : null}
          {block.projection.remainingMinutes != null ? (
            <Detail.Metadata.Label
              title="Projected Runway"
              text={countdown(block.projection.remainingMinutes * 60_000)}
            />
          ) : null}

          {block.perModelTokens.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              {block.perModelTokens.map((m) => (
                <Detail.Metadata.Label
                  key={m.model}
                  title={shortModelName(m.model)}
                  text={`${formatNumber(m.tokens)} tok`}
                  icon={{
                    source: Icon.CircleFilled,
                    tintColor: modelFamilyColor(m.model),
                  }}
                />
              ))}
            </>
          ) : block.models.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Models">
                {block.models.map((m) => (
                  <Detail.Metadata.TagList.Item
                    key={m}
                    text={shortModelName(m)}
                    color={modelFamilyColor(m)}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          ) : null}
        </>
      ) : null}

      {week && week.ok && week.week ? (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Week Of"
            text={formatWeekOf(week.week.period)}
            icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Label
            title="This Week Tokens"
            text={formatNumber(week.week.totalTokens)}
          />
          <Detail.Metadata.Label
            title="This Week Cost (est.)"
            text={`${formatCost(week.week.totalCost, prefs)}${approx}`}
          />
        </>
      ) : null}
    </Detail.Metadata>
  );
}

/** Turn an install result into a single, human-readable toast. */
function describeInstall(result: InstallResult): {
  style: Toast.Style;
  title: string;
  message?: string;
} {
  if (result.status === "error") {
    return {
      style: Toast.Style.Failure,
      title: "Setup failed",
      message: result.message,
    };
  }

  const parts: string[] = [];
  if (result.status === "created") {
    parts.push("Created a status line script.");
  } else if (result.status === "installed") {
    parts.push(`Capture installed (backup: ${result.backupPath}).`);
  } else {
    parts.push("Capture block already present.");
  }

  // `needsAction` means the script is in place but Claude Code won't actually
  // run it yet — so we must not report an unqualified success.
  let needsAction = false;
  const settings = result.settings;
  if (settings.status === "wired") {
    parts.push(
      settings.backupPath
        ? `Wired statusLine in settings.json (backup: ${settings.backupPath}).`
        : "Wired statusLine in settings.json.",
    );
  } else if (settings.status === "already" && !settings.pointsAtScript) {
    needsAction = true;
    parts.push(
      `But settings.json already has a statusLine pointing elsewhere — it was left untouched, so this script won't run until you point statusLine at ${result.scriptPath}. Use “Copy settings.json Snippet”, or add the capture block to the script your statusLine references.`,
    );
  } else if (settings.status === "error") {
    needsAction = true;
    parts.push(
      `Couldn't wire settings.json (${settings.message}) — add the “Copy settings.json Snippet” output manually.`,
    );
  }
  // settings.status === "already" with pointsAtScript === true → already wired, no note.

  parts.push(
    needsAction
      ? "Then run Claude Code once and press ⌘R."
      : "Run Claude Code once, then press ⌘R.",
  );

  return {
    style: needsAction ? Toast.Style.Failure : Toast.Style.Success,
    title: needsAction ? "One more step needed" : "Status line set up",
    message: parts.join(" "),
  };
}

function SetupView({
  cache,
  refreshAction,
}: {
  cache: Extract<StatuslineCache, { configured: false }>;
  refreshAction: React.ReactNode;
}) {
  const markdown = [
    "# Claude Session — One‑Time Setup",
    "",
    "> ✅ This screen is expected on first run — **not an error.** One click below sets",
    "> everything up; it takes about a minute.",
    "",
    "Claude Gauge shows your Claude **subscription** 5‑hour & 7‑day limits. Anthropic",
    "doesn't expose these over any API and Claude Code doesn't store them on disk — the",
    "only place they appear is the JSON your Claude Code **status line** receives. So",
    "Claude Gauge reads them from a tiny cache file your status line writes:",
    "",
    `\`${cache.path}\``,
    "",
    "### Set it up (one click)",
    "",
    "1. Run **Set Up Status Line** below. It will:",
    "   - add a small, clearly‑marked capture block to your status line script (a `.bak`",
    "     backup is made first), and",
    "   - if you don't have a status line yet, **create one** and wire it up in",
    "     `settings.json` — also backed up, and only if you don't already have a",
    "     `statusLine` (existing settings are never overwritten).",
    "2. **Run Claude Code once** (or wait for the next status line refresh) so the cache",
    "   fills.",
    "3. Press **⌘R** to refresh this view.",
    "",
    "Prefer to do it by hand? Use **Copy Status Line Snippet** and paste the block right",
    "after the line that reads stdin (`input=$(cat)`) in:",
    "",
    `\`${statuslineScriptPath()}\``,
    "",
    "If you have no status line at all, also add the **settings.json snippet** to",
    `\`${settingsJsonPath()}\`.`,
    "",
    "_Requires `jq` (most Claude Code status lines already use it; if it's",
    "missing, install it — e.g. `brew install jq`)._",
    "",
    "_Still on this screen after setup? Make sure `jq` is installed and on the",
    "PATH your Claude Code status line runs with, then run Claude Code once._",
    "",
    `_Status: ${cache.message}_`,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Set Up Status Line"
            icon={Icon.Download}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Setting up status line…",
              });
              const result = await installStatuslineCapture();
              const described = describeInstall(result);
              toast.style = described.style;
              toast.title = described.title;
              if (described.message) toast.message = described.message;
            }}
          />
          <Action
            title="Copy Status Line Snippet"
            icon={Icon.Terminal}
            onAction={async () => {
              await Clipboard.copy(manualSnippet());
              await showToast({
                style: Toast.Style.Success,
                title: "Snippet copied to clipboard",
              });
            }}
          />
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Copy settings.json Snippet"
            icon={Icon.CodeBlock}
            onAction={async () => {
              await Clipboard.copy(statusLineSnippet(statuslineScriptPath()));
              await showToast({
                style: Toast.Style.Success,
                title: "settings.json snippet copied",
              });
            }}
          />
          {refreshAction}
        </ActionPanel>
      }
    />
  );
}
