import {
  Clipboard,
  Color,
  Icon,
  Image,
  LocalStorage,
  MenuBarExtra,
  open,
} from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript, useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { homedir } from "os";

// Raycast runs commands in a Node worker thread, and `--disable-warning` from
// NODE_OPTIONS is not inherited by worker threads. Silence the noisy `punycode`
// deprecation (DEP0040) emitted by a transitive dependency, in-process, while
// still letting every other warning through.
{
  const originalWarningListeners = process.listeners("warning");
  process.removeAllListeners("warning");
  process.on("warning", (warning) => {
    if (
      warning.name === "DeprecationWarning" &&
      warning.message.includes("punycode")
    ) {
      return;
    }
    for (const listener of originalWarningListeners) {
      listener(warning);
    }
  });
}

const WARN_AT = 95;

// Shown in place of a countdown when the 5-hour window has lapsed and nothing
// has started a new one.
const IDLE_SESSION = "No active session";

// Claude's signature orange, used for the progress fill.
const CLAUDE_ORANGE = "#D97757";

// Neutral track behind the fill, drawn at full opacity — a translucent grey
// disappears into both the dark menu bar and the dropdown background.
const TRACK_GREY = "#444";

// `Color.Red` is the token string "raycast-red", which Raycast resolves for
// `tintColor` but not inside a raw SVG — as a `fill` it's an invalid paint and
// silently draws nothing. Hex is required here.
const WARN_RED = "#D97757"; //"#FF6363";

type UsageWindow = {
  utilization?: number | null;
  resets_at?: string | null;
};

type SpendAmount = {
  amount_minor?: number | null;
  currency?: string | null;
  exponent?: number | null;
};

type UsageResponse = {
  five_hour?: UsageWindow | null;
  seven_day?: UsageWindow | null;
  seven_day_opus?: UsageWindow | null;
  seven_day_sonnet?: UsageWindow | null;
  seven_day_oauth_apps?: UsageWindow | null;
  extra_usage?:
    | (UsageWindow & {
        is_enabled?: boolean;
        credits_ever_enabled?: boolean;
        spend_limit_reached?: boolean;
        user_disabled?: boolean;
      })
    | null;
  spend?: {
    percent?: number | null;
    used?: SpendAmount | null;
    limit?: SpendAmount | null;
    enabled?: boolean | null;
    disabled_reason?: string | null;
    resets_at?: string | null;
  } | null;
};

export type UsageItem = {
  id: string;
  label: string;
  percent: number;
  resetAt?: string;
  detail?: string;
  isSession?: boolean;
};

// Ordered to mirror Claude Code's `/usage` screen.
const WINDOWS: Array<{
  key: keyof UsageResponse;
  label: string;
  isSession?: boolean;
}> = [
  { key: "five_hour", label: "Current session", isSession: true },
  { key: "seven_day", label: "Current week (all models)" },
  { key: "seven_day_opus", label: "Current week (Opus)" },
  { key: "seven_day_sonnet", label: "Current week (Sonnet)" },
  { key: "seven_day_oauth_apps", label: "Current week (OAuth apps)" },
];

/** Human, countdown-style reset label matching the web UI ("Resets in 42 min"). */
function formatCountdown(resetAt?: string): string | undefined {
  if (!resetAt) return undefined;

  const target = new Date(resetAt).getTime();
  if (Number.isNaN(target)) return undefined;

  const totalMinutes = Math.max(0, Math.round((target - Date.now()) / 60000));
  if (totalMinutes <= 0) return "Resets now";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `Resets in ${days}d ${hours}h`;
  if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
  return `Resets in ${minutes}m`;
}

/** Compact minutes-remaining label for the menu bar title (e.g. "42m", "3h"). */
function minutesRemainingLabel(resetAt?: string): string | undefined {
  if (!resetAt) return undefined;

  const target = new Date(resetAt).getTime();
  if (Number.isNaN(target)) return undefined;

  const totalMinutes = Math.max(0, Math.round((target - Date.now()) / 60000));
  if (totalMinutes <= 0) return "0m";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function formatMoney(amount?: SpendAmount | null): string | undefined {
  if (!amount || typeof amount.amount_minor !== "number") return undefined;

  const exponent = amount.exponent ?? 2;
  const value = amount.amount_minor / 10 ** exponent;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: amount.currency ?? "USD",
  }).format(value);
}

/** Short note explaining why credits can't be spent, when they can't. */
function creditsStatus(
  spend: UsageResponse["spend"],
  extraUsage: UsageResponse["extra_usage"],
): string | undefined {
  if (spend?.enabled === true || extraUsage?.is_enabled === true) {
    return undefined;
  }

  if (extraUsage?.spend_limit_reached) return "Limit reached";
  if (extraUsage?.user_disabled) return "Turned off";

  switch (spend?.disabled_reason) {
    case "spend_limit_reached":
      return "Limit reached";
    case "org_level_disabled_until":
      return "Disabled by your organization";
    default:
      return "Credits off";
  }
}

export function parseUsage(raw: string): UsageItem[] {
  let response: UsageResponse;

  try {
    response = JSON.parse(raw) as UsageResponse;
  } catch {
    return [];
  }

  const items: UsageItem[] = [];

  for (const { key, label, isSession } of WINDOWS) {
    const usage = response[key] as UsageWindow | null | undefined;
    if (
      !usage ||
      typeof usage.utilization !== "number" ||
      !Number.isFinite(usage.utilization)
    )
      continue;

    items.push({
      id: String(key),
      label,
      percent: usage.utilization,
      resetAt: usage.resets_at ?? undefined,
      isSession,
    });
  }

  // Prefer the richer `spend` block for usage credits; fall back to `extra_usage`.
  const spend = response.spend;
  const extraUsage = response.extra_usage;

  // `enabled` means "credits can be spent right now", not "credits apply to
  // this account" — hitting the cap flips it to false. Gating the row on it
  // hid the section exactly when it mattered most, so key off whether credits
  // have ever been turned on instead.
  const creditsRelevant =
    spend?.enabled === true ||
    extraUsage?.is_enabled === true ||
    extraUsage?.credits_ever_enabled === true;

  if (creditsRelevant && typeof spend?.percent === "number") {
    const used = formatMoney(spend.used);
    const limit = formatMoney(spend.limit);
    const spent = used && limit ? `${used} / ${limit} spent` : undefined;
    const status = creditsStatus(spend, extraUsage);

    items.push({
      id: "usage_credits",
      label: "Usage credits",
      percent: spend.percent,
      resetAt: spend.resets_at ?? undefined,
      detail: [spent, status].filter(Boolean).join("  ·  ") || undefined,
    });
  } else if (
    creditsRelevant &&
    typeof extraUsage?.utilization === "number" &&
    Number.isFinite(extraUsage.utilization)
  ) {
    items.push({
      id: "usage_credits",
      label: "Usage credits",
      percent: extraUsage.utilization,
      resetAt: extraUsage.resets_at ?? undefined,
      detail: creditsStatus(spend, extraUsage),
    });
  }

  return items;
}

function displayPercent(percent: number): string {
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

function progressFor(percent: number): number {
  return Math.min(Math.max(percent / 100, 0), 1);
}

function fillColor(percent: number): string {
  if (percent >= WARN_AT) return WARN_RED;
  return CLAUDE_ORANGE;
}

/** Point on the circle at `angle` degrees, measured clockwise from 12 o'clock. */
function polarToCartesian(radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: (50 + radius * Math.cos(angleInRadians)).toFixed(2),
    y: (50 + radius * Math.sin(angleInRadians)).toFixed(2),
  };
}

/**
 * Full disc, as a path rather than a `<circle>`.
 *
 * Raycast's SVG renderer draws `<path>` but ignores `<circle>` — a track drawn
 * as a circle came out invisible, and a 100% icon (two circles, no path) came
 * out completely blank. Two half arcs give the same shape via a path.
 */
function describeDisc(radius: number): string {
  const top = 50 - radius;
  const bottom = 50 + radius;
  return `M 50 ${top} A ${radius} ${radius} 0 1 1 50 ${bottom} A ${radius} ${radius} 0 1 1 50 ${top} Z`;
}

/** Filled wedge from the center, sweeping clockwise from 12 o'clock. */
function describeWedge(radius: number, sweepInDegrees: number): string {
  const start = polarToCartesian(radius, 0);
  const end = polarToCartesian(radius, sweepInDegrees);
  const largeArcFlag = sweepInDegrees > 180 ? "1" : "0";
  return `M 50 50 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

/**
 * A grey disc that fills clockwise with an orange pie slice as usage climbs.
 *
 * This replaces `getProgressIcon` from @raycast/utils, which interpolates the
 * color straight into a `data:image/svg+xml,` URI without escaping it. A hex
 * color's `#` opens a URL fragment there, truncating the SVG mid-attribute so
 * nothing renders at all. We percent-encode the payload instead.
 */
function progressIcon(percent: number): Image.ImageLike {
  const progress = progressFor(percent);
  const color = fillColor(percent);
  const radius = 46;

  // A 360° sweep is degenerate — start and end land on the same point, drawing
  // nothing — so a full slice is just the whole disc.
  const slice =
    progress >= 1
      ? `<path d="${describeDisc(radius)}" fill="${color}" />`
      : progress > 0
        ? `<path d="${describeWedge(radius, progress * 360)}" fill="${color}" />`
        : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">`,
    `<path d="${describeDisc(radius)}" fill="${TRACK_GREY}" />`,
    slice,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function refreshSeconds(): number {
  const raw = getPreferenceValues<Preferences.Usage>().refreshSeconds;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

export default function Command() {
  // "Refresh Now" drops the throttle to 0 for this run. Each background wake is
  // a fresh process, so this never persists past the open menu.
  const [minAge, setMinAge] = useState(refreshSeconds);

  const { data, isLoading, error, revalidate } = useExec(
    "/bin/sh",
    [
      "-c",
      `
# The private usage endpoint is rate limited (HTTP 429). We persist the last
# successful response to a disk cache and replay it on any non-200 result, so
# the menu bar keeps showing the most recent known usage instead of going blank
# (mirrors Claude Code's "showing last-known usage" behavior).
CACHE_DIR="$HOME/Library/Caches/com.raycast.claude-usage"
CACHE_FILE="$CACHE_DIR/last-usage.json"
mkdir -p "$CACHE_DIR" 2>/dev/null

# Raycast's background interval is fixed in the manifest, so the command wakes
# every minute regardless. The first argument is the chosen frequency: if the
# cache is younger than that, replay it and skip the network entirely. Passing
# 0 (the "Refresh Now" action) always fetches.
MIN_AGE=\${1:-0}
if [ "$MIN_AGE" -gt 0 ] && [ -s "$CACHE_FILE" ]; then
  AGE=$(( $(/bin/date +%s) - $(/usr/bin/stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0) ))
  if [ "$AGE" -lt "$MIN_AGE" ]; then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

CREDENTIALS=$(/usr/bin/security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null) || {
  echo "Claude Code credentials were not found in the macOS Keychain." >&2
  exit 1
}

TOKEN=$(printf '%s' "$CREDENTIALS" | /usr/bin/python3 -c 'import json, sys; print(json.load(sys.stdin).get("claudeAiOauth", {}).get("accessToken", ""))') || {
  echo "Claude Code credentials could not be read." >&2
  exit 1
}

if [ -z "$TOKEN" ]; then
  echo "Claude Code OAuth token was missing from the Keychain credential." >&2
  exit 1
fi

BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
STATUS=$(/usr/bin/curl --silent --show-error --max-time 20 -o "$BODY" -w '%{http_code}' \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "anthropic-beta: oauth-2025-04-20" \\
  -H "Accept: application/json" \\
  "https://api.anthropic.com/api/oauth/usage")

if [ "$STATUS" = "200" ] && [ -s "$BODY" ]; then
  cp "$BODY" "$CACHE_FILE" 2>/dev/null
  cat "$BODY"
elif [ -s "$CACHE_FILE" ]; then
  cat "$CACHE_FILE"
else
  echo "Claude usage endpoint returned HTTP $STATUS and no cached data is available yet." >&2
  exit 1
fi
      `,
      "claude-usage",
      String(minAge),
    ],
    {
      env: {
        HOME: process.env.HOME ?? homedir(),
        USER: process.env.USER ?? "user",
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        LANG: process.env.LANG ?? "en_US.UTF-8",
      },
      encoding: "utf8",
      cwd: homedir(),
      timeout: 30_000,
      keepPreviousData: true,
    },
  );

  const items = data ? parseUsage(data) : [];
  const session = items.find((item) => item.isSession);
  const sessionPercent = session?.percent ?? 0;
  const warn = sessionPercent >= WARN_AT;

  useEffect(() => {
    void (async () => {
      if (!warn) {
        await LocalStorage.removeItem("notified");
        return;
      }

      const rounded = String(Math.round(sessionPercent));
      if ((await LocalStorage.getItem<string>("notified")) === rounded) return;

      await LocalStorage.setItem("notified", rounded);
      await runAppleScript(
        `display notification "Session usage at ${rounded}% — approaching your limit" with title "⚠️ Claude Usage" sound name "Ping"`,
      ).catch(() => undefined);
    })();
  }, [warn, sessionPercent]);

  const sessionRemaining = minutesRemainingLabel(session?.resetAt);
  const menuTitle = session
    ? sessionRemaining
      ? `${Math.round(sessionPercent)}% · ${sessionRemaining}`
      : `${Math.round(sessionPercent)}%`
    : undefined;

  // The API reports `resets_at: null` for the 5-hour window once it lapses with
  // no new session started — there is genuinely no clock to show until the next
  // request starts one.
  const sessionCountdown = formatCountdown(session?.resetAt) ?? IDLE_SESSION;

  const tooltip = session
    ? `Current session: ${displayPercent(sessionPercent)}% used — ${sessionCountdown}`
    : "Claude Usage";

  const menuIcon = session ? progressIcon(sessionPercent) : Icon.BarChart;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={menuTitle}
      tooltip={tooltip}
      icon={menuIcon}
    >
      {error && (
        <MenuBarExtra.Item
          title="Failed to fetch Claude usage"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          onAction={() => Clipboard.copy(error.message)}
        />
      )}

      {warn && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Session usage at ${Math.round(sessionPercent)}%`}
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
          />
        </MenuBarExtra.Section>
      )}

      {items.map((item) => {
        const countdown =
          formatCountdown(item.resetAt) ??
          (item.isSession ? IDLE_SESSION : undefined);
        const subtitleParts = [countdown, item.detail].filter(Boolean);

        return (
          <MenuBarExtra.Section key={item.id} title={item.label}>
            <MenuBarExtra.Item
              icon={progressIcon(item.percent)}
              title={`${displayPercent(item.percent)}% used`}
              subtitle={
                subtitleParts.length ? `   ${subtitleParts.join("  ·  ")}` : ""
              }
              onAction={() =>
                Clipboard.copy(
                  `${item.label}: ${displayPercent(item.percent)}% used${
                    countdown ? ` (${countdown})` : ""
                  }`,
                )
              }
            />
          </MenuBarExtra.Section>
        );
      })}

      {data && !error && items.length === 0 && (
        <MenuBarExtra.Item
          title="Could not parse usage response"
          subtitle="Click to copy the response"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          onAction={() => Clipboard.copy(data)}
        />
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            // Changing args re-runs the command on its own; revalidate covers
            // the case where the throttle was already 0.
            setMinAge(0);
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Open Usage Settings"
          icon={Icon.Globe}
          onAction={() => open("https://claude.ai/settings/usage")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
