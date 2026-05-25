import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformPicks,
  TimeFormat,
  allPlatformPicks,
  formatExactHour,
  formatRelative,
  formatWindow,
  formatWindowCompact,
} from "./compute";
import { renderHeatmapMarkdown } from "./heatmap-markdown";
import { Platform } from "./heatmaps";
import { CLOCK_BEST, CLOCK_GOOD, IconColorMode, platformIcon } from "./icons";
import { ManagePlatforms } from "./manage-platforms";
import {
  PlatformsConfig,
  loadPlatformsConfig,
  savePlatformsConfig,
} from "./storage";

type Prefs = {
  timeFormat: TimeFormat;
  iconColorLight: IconColorMode;
  iconColorDark: IconColorMode;
  postUrlFacebook: string;
  postUrlInstagram: string;
  postUrlLinkedin: string;
  postUrlTiktok: string;
  postUrlYoutubeShorts: string;
  postUrlYoutubeLong: string;
  postUrlX: string;
  postUrlThreads: string;
};

const BUFFER_BASE =
  "https://buffer.com/resources/best-time-to-post-social-media/";

/** Resolve the active post URL for a platform: user override if set, default otherwise. */
function postUrlFor(platform: Platform, prefs: Prefs): string {
  const override = (prefs as Record<string, string | undefined>)[
    platform.postUrlPrefKey
  ]?.trim();
  return override && override.length > 0 ? override : platform.postUrl;
}

const bufferUrlFor = (platform: Platform) =>
  `${BUFFER_BASE}${platform.bufferAnchor}`;

/** Pick the right icon-color mode for the current system appearance. */
function effectiveIconMode(prefs: Prefs): IconColorMode {
  return environment.appearance === "dark"
    ? prefs.iconColorDark
    : prefs.iconColorLight;
}

// ─── Command ───────────────────────────────────────────────────────────────

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const timeFormat = prefs.timeFormat ?? "ampm";
  const iconMode = effectiveIconMode(prefs);

  const [now, setNow] = useState(() => new Date());
  const [config, setConfig] = useState<PlatformsConfig | null>(null);

  // Re-tick every minute so countdowns stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Load persisted platform config on mount.
  useEffect(() => {
    loadPlatformsConfig().then(setConfig);
  }, []);

  // ManagePlatforms calls this with the updated config; we mirror it into
  // state so the list re-renders, and persist to storage so it survives
  // restarts.
  const applyConfig = useCallback((next: PlatformsConfig) => {
    setConfig(next);
    void savePlatformsConfig(next);
  }, []);

  const results = useMemo(() => {
    if (!config) return [];
    return allPlatformPicks(now, config.included);
  }, [now, config]);

  return (
    <List
      searchBarPlaceholder="Filter platforms"
      navigationTitle="Next Best Time to Post"
      isLoading={config === null}
    >
      {results.map((ps) => (
        <PlatformRow
          key={ps.platform.id}
          picks={ps}
          now={now}
          timeFormat={timeFormat}
          iconMode={iconMode}
          prefs={prefs}
          config={config}
          onApplyConfig={applyConfig}
        />
      ))}
    </List>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

function PlatformRow({
  picks,
  now,
  timeFormat,
  iconMode,
  prefs,
  config,
  onApplyConfig,
}: {
  picks: PlatformPicks;
  now: Date;
  timeFormat: TimeFormat;
  iconMode: IconColorMode;
  prefs: Prefs;
  config: PlatformsConfig | null;
  onApplyConfig: (next: PlatformsConfig) => void;
}) {
  const { platform, bestHour, windows } = picks;

  // Title: the exact peak hour if there's a # in the lookahead; otherwise
  // fall back to the soonest good-or-better window so the row stays useful.
  // With the lookahead fixed at 7 days and every shipped platform having at
  // least one good slot per week, the third branch is currently unreachable
  // — but it's kept as defensive code in case future heatmap edits ever
  // leave a platform with no good cells, so the row still renders something
  // instead of crashing.
  let title: string;
  let subtitle: string;
  if (bestHour) {
    title = formatExactHour(bestHour.when, timeFormat);
    subtitle = formatRelative(now, bestHour.when);
  } else if (windows[0]) {
    title = formatWindow(windows[0], timeFormat);
    subtitle = formatRelative(now, windows[0].start);
  } else {
    title = "—";
    subtitle = "no window in lookahead";
  }

  const accessories: List.Item.Accessory[] = windows.slice(0, 3).map((w) => ({
    text: formatWindowCompact(w, timeFormat),
    icon: w.intensity === 3 ? CLOCK_BEST : CLOCK_GOOD,
    tooltip: `${formatWindow(w, timeFormat)} · ${formatRelative(now, w.start)}`,
  }));

  return (
    <List.Item
      icon={platformIcon(platform, iconMode)}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[platform.name, platform.id]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Heatmap"
            icon={Icon.BarChart}
            target={
              <PlatformDetail
                platform={platform}
                now={now}
                timeFormat={timeFormat}
                prefs={prefs}
              />
            }
          />
          <PlatformCommonActions platform={platform} prefs={prefs} />
          {config && (
            <Action.Push
              title="Manage Platforms…"
              icon={Icon.List}
              target={
                <ManagePlatforms
                  config={config}
                  iconMode={iconMode}
                  onApply={onApplyConfig}
                />
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ─── Detail ────────────────────────────────────────────────────────────────

function PlatformDetail({
  platform,
  now,
  timeFormat,
  prefs,
}: {
  platform: Platform;
  now: Date;
  timeFormat: TimeFormat;
  prefs: Prefs;
}) {
  const md = renderHeatmapMarkdown(platform, now, timeFormat);
  return (
    <Detail
      navigationTitle={platform.name}
      markdown={md}
      actions={
        <ActionPanel>
          <PlatformCommonActions platform={platform} prefs={prefs} />
        </ActionPanel>
      }
    />
  );
}

// ─── Shared actions ────────────────────────────────────────────────────────
// Actions that appear in both the list row and the heatmap detail. Rendered
// as a fragment so they nest cleanly inside whichever <ActionPanel> wraps
// them. Settings are reachable via Raycast's native ⌘+⇧+, route, so we
// don't duplicate them in the in-app menu.

function PlatformCommonActions({
  platform,
  prefs,
}: {
  platform: Platform;
  prefs: Prefs;
}) {
  return (
    <>
      <Action.OpenInBrowser
        title={`Post on ${platform.name}`}
        icon={Icon.Pencil}
        url={postUrlFor(platform, prefs)}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
      />
      <Action.OpenInBrowser
        title="View Buffer Source"
        url={bufferUrlFor(platform)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
    </>
  );
}
