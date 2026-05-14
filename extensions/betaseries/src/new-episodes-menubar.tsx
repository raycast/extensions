import {
  getPreferenceValues,
  Icon,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  environment,
  launchCommand,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  getMyShows,
  getPlanning,
  getTokenFromStorage,
  getUnwatchedEpisodes,
} from "./api/client";
import { Episode, MemberPlanning, Show } from "./types/betaseries";
import {
  DISABLED_SHOW_NOTIFICATIONS_KEY,
  DISCARDED_EPISODE_IDS_KEY,
  PENDING_EPISODE_IDS_KEY,
  getStoredNumberIds,
  normalizeNumberIds,
  setStoredNumberIds,
} from "./notifications";

const MAX_PARALLEL_UNSEEN_REQUESTS = 5;
const UNSEEN_FETCH_MAX_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 500;
const NOTIFICATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type AlertEpisode = {
  id: number;
  showId: number;
  showTitle: string;
  code: string;
  date: string;
  episodeTitle: string;
  label: string;
  url: string;
  releaseTimestamp: number | null;
};

type MenuBarState = {
  configured: boolean;
  visibleEpisodes: AlertEpisode[];
  debug: {
    launchType: string;
    activeShows: number;
    showsWithRemaining: number;
    disabledShows: number;
    fetchFailedShows: number;
    totalUnseenEpisodes: number;
    invalidDateEpisodes: number;
    futureEpisodes: number;
    tooOldEpisodes: number;
    releasedInWindowEpisodes: number;
    trackedEpisodes: number;
    discardedEpisodes: number;
    pendingEpisodes: number;
    episodesToNotify: number;
    visibleEpisodes: number;
    shows: Array<{
      showId: number;
      showTitle: string;
      tracked: boolean;
      fetchOk: boolean;
      remaining: number;
      episodeStatuses: Array<{
        episodeId: number;
        code: string;
        date: string;
        status:
          | "invalid-date"
          | "future"
          | "too-old"
          | "disabled-show"
          | "discarded"
          | "already-visible"
          | "new-visible";
      }>;
    }>;
  };
};

type UnseenFetchResult = {
  show: Show;
  unseen: Episode[];
  fetchOk: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("network")
  );
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<U>,
): Promise<U[]> {
  if (items.length === 0) return [];

  const results: U[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

async function fetchUnseenEpisodesForShow(
  show: Show,
): Promise<UnseenFetchResult> {
  for (let attempt = 1; attempt <= UNSEEN_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const unseen = await getUnwatchedEpisodes(show.id);
      return { show, unseen, fetchOk: true };
    } catch (error) {
      const shouldRetry =
        attempt < UNSEEN_FETCH_MAX_ATTEMPTS && isRetryableError(error);
      if (!shouldRetry) {
        return { show, unseen: [] as Episode[], fetchOk: false };
      }
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  return { show, unseen: [] as Episode[], fetchOk: false };
}

function parseEpisodeDate(date: string): Date | null {
  if (!date) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month, day, 0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toTimestamp(date: string): number | null {
  const parsed = parseEpisodeDate(date);
  if (!parsed) return null;
  return parsed.getTime();
}

function toAlertEpisode(show: Show, episode: Episode): AlertEpisode {
  const code =
    episode.code || `S${episode.season || 0}E${episode.episode || 0}`;
  return {
    id: episode.id,
    showId: show.id,
    showTitle: show.title,
    code,
    date: episode.date || "",
    episodeTitle: episode.title || "",
    label: `${show.title} - ${code}`,
    url:
      episode.resource_url ||
      `https://www.betaseries.com/episode/${episode.id}`,
    releaseTimestamp: toTimestamp(episode.date || ""),
  };
}

function toAlertEpisodeFromPlanning(item: MemberPlanning): AlertEpisode {
  const code = item.code || `S${item.season || 0}E${item.episode || 0}`;
  return {
    id: item.episode_id,
    showId: item.show_id,
    showTitle: item.show_title || "Unknown Show",
    code,
    date: item.date || "",
    episodeTitle: item.title || "",
    label: `${item.show_title || "Unknown Show"} - ${code}`,
    url: `https://www.betaseries.com/episode/${item.episode_id}`,
    releaseTimestamp: toTimestamp(item.date || ""),
  };
}

function compareAlertEpisodes(a: AlertEpisode, b: AlertEpisode): number {
  if (a.releaseTimestamp !== null && b.releaseTimestamp !== null) {
    if (a.releaseTimestamp !== b.releaseTimestamp) {
      return a.releaseTimestamp - b.releaseTimestamp;
    }
  } else if (a.releaseTimestamp !== null) {
    return -1;
  } else if (b.releaseTimestamp !== null) {
    return 1;
  }

  if (a.showTitle !== b.showTitle) {
    return a.showTitle.localeCompare(b.showTitle);
  }

  return a.id - b.id;
}

async function buildMenuBarState(): Promise<MenuBarState> {
  if (environment.launchType === LaunchType.Background) {
    return buildMenuBarStateForBackground();
  }

  const token = await getTokenFromStorage();
  if (!token) {
    return {
      configured: false,
      visibleEpisodes: [],
      debug: {
        launchType: String(environment.launchType),
        activeShows: 0,
        showsWithRemaining: 0,
        disabledShows: 0,
        fetchFailedShows: 0,
        totalUnseenEpisodes: 0,
        invalidDateEpisodes: 0,
        futureEpisodes: 0,
        tooOldEpisodes: 0,
        releasedInWindowEpisodes: 0,
        trackedEpisodes: 0,
        discardedEpisodes: 0,
        pendingEpisodes: 0,
        episodesToNotify: 0,
        visibleEpisodes: 0,
        shows: [],
      },
    };
  }

  const now = new Date();
  const nowMs = now.getTime();
  const minReleaseTimestamp = nowMs - NOTIFICATION_WINDOW_MS;

  const [
    activeShows,
    disabledShowIds,
    storedPendingEpisodeIds,
    storedDiscardedEpisodeIds,
  ] = await Promise.all([
    getMyShows("current"),
    getStoredNumberIds(DISABLED_SHOW_NOTIFICATIONS_KEY),
    getStoredNumberIds(PENDING_EPISODE_IDS_KEY),
    getStoredNumberIds(DISCARDED_EPISODE_IDS_KEY),
  ]);

  const showsWithRemaining = activeShows.filter(
    (show) => !show.user?.archived && (show.user?.remaining ?? 0) > 0,
  );

  const unseenByShow = await mapWithConcurrency(
    showsWithRemaining,
    MAX_PARALLEL_UNSEEN_REQUESTS,
    fetchUnseenEpisodesForShow,
  );
  const fetchFailedShows = unseenByShow.filter(
    ({ fetchOk }) => !fetchOk,
  ).length;

  const debugShowsById = new Map<
    number,
    MenuBarState["debug"]["shows"][number]
  >();
  for (const { show, fetchOk } of unseenByShow) {
    debugShowsById.set(show.id, {
      showId: show.id,
      showTitle: show.title,
      tracked: !disabledShowIds.includes(show.id),
      fetchOk,
      remaining: show.user?.remaining ?? 0,
      episodeStatuses: [],
    });
  }

  const episodeCandidates: Array<{
    showId: number;
    episode: AlertEpisode;
    windowStatus: "invalid-date" | "future" | "too-old" | "in-window";
  }> = [];

  let totalUnseenEpisodes = 0;
  let invalidDateEpisodes = 0;
  let futureEpisodes = 0;
  let tooOldEpisodes = 0;
  const releasedEpisodes: AlertEpisode[] = [];

  for (const { show, unseen, fetchOk } of unseenByShow) {
    if (!fetchOk) continue;

    for (const episode of unseen) {
      totalUnseenEpisodes += 1;
      const alertEpisode = toAlertEpisode(show, episode);
      const releaseTimestamp = alertEpisode.releaseTimestamp;

      if (releaseTimestamp === null) {
        invalidDateEpisodes += 1;
        episodeCandidates.push({
          showId: show.id,
          episode: alertEpisode,
          windowStatus: "invalid-date",
        });
        continue;
      }
      if (releaseTimestamp > nowMs) {
        futureEpisodes += 1;
        episodeCandidates.push({
          showId: show.id,
          episode: alertEpisode,
          windowStatus: "future",
        });
        continue;
      }
      if (releaseTimestamp < minReleaseTimestamp) {
        tooOldEpisodes += 1;
        episodeCandidates.push({
          showId: show.id,
          episode: alertEpisode,
          windowStatus: "too-old",
        });
        continue;
      }

      episodeCandidates.push({
        showId: show.id,
        episode: alertEpisode,
        windowStatus: "in-window",
      });
      releasedEpisodes.push(alertEpisode);
    }
  }

  releasedEpisodes.sort(compareAlertEpisodes);

  const currentWindowEpisodeIds = new Set(
    releasedEpisodes.map((episode) => episode.id),
  );
  const disabledShowIdsSet = new Set(disabledShowIds);
  const previousPendingEpisodeIdsSet = new Set(
    storedPendingEpisodeIds.filter((episodeId) =>
      currentWindowEpisodeIds.has(episodeId),
    ),
  );
  const discardedEpisodeIdsSet = new Set(
    storedDiscardedEpisodeIds.filter((episodeId) =>
      currentWindowEpisodeIds.has(episodeId),
    ),
  );

  const trackedReleasedEpisodes = releasedEpisodes.filter(
    (episode) => !disabledShowIdsSet.has(episode.showId),
  );

  const visibleEpisodes = trackedReleasedEpisodes.filter(
    (episode) => !discardedEpisodeIdsSet.has(episode.id),
  );
  const visibleEpisodeIdsSet = new Set(
    visibleEpisodes.map((episode) => episode.id),
  );
  const episodesToNotify = visibleEpisodes.filter(
    (episode) => !previousPendingEpisodeIdsSet.has(episode.id),
  );
  const episodesToNotifySet = new Set(
    episodesToNotify.map((episode) => episode.id),
  );

  for (const candidate of episodeCandidates) {
    const showDebug = debugShowsById.get(candidate.showId);
    if (!showDebug) continue;

    let status: MenuBarState["debug"]["shows"][number]["episodeStatuses"][number]["status"];
    if (candidate.windowStatus === "invalid-date") status = "invalid-date";
    else if (candidate.windowStatus === "future") status = "future";
    else if (candidate.windowStatus === "too-old") status = "too-old";
    else if (!showDebug.tracked) status = "disabled-show";
    else if (discardedEpisodeIdsSet.has(candidate.episode.id))
      status = "discarded";
    else if (episodesToNotifySet.has(candidate.episode.id))
      status = "new-visible";
    else status = "already-visible";

    showDebug.episodeStatuses.push({
      episodeId: candidate.episode.id,
      code: candidate.episode.code,
      date: candidate.episode.date,
      status,
    });
  }

  const debugShows = Array.from(debugShowsById.values()).sort((a, b) =>
    a.showTitle.localeCompare(b.showTitle),
  );

  const storageUpdates: Promise<void>[] = [
    setStoredNumberIds(
      PENDING_EPISODE_IDS_KEY,
      normalizeNumberIds(Array.from(visibleEpisodeIdsSet)),
    ),
    setStoredNumberIds(
      DISCARDED_EPISODE_IDS_KEY,
      normalizeNumberIds(Array.from(discardedEpisodeIdsSet)),
    ),
    LocalStorage.removeItem("new-episodes-notified-episode-ids"),
    LocalStorage.removeItem("new-episodes-last-check-at"),
  ];

  await Promise.all(storageUpdates);

  return {
    configured: true,
    visibleEpisodes,
    debug: {
      launchType: String(environment.launchType),
      activeShows: activeShows.length,
      showsWithRemaining: showsWithRemaining.length,
      disabledShows: disabledShowIdsSet.size,
      fetchFailedShows,
      totalUnseenEpisodes,
      invalidDateEpisodes,
      futureEpisodes,
      tooOldEpisodes,
      releasedInWindowEpisodes: releasedEpisodes.length,
      trackedEpisodes: trackedReleasedEpisodes.length,
      discardedEpisodes:
        trackedReleasedEpisodes.length - visibleEpisodes.length,
      pendingEpisodes: previousPendingEpisodeIdsSet.size,
      episodesToNotify: episodesToNotify.length,
      visibleEpisodes: visibleEpisodes.length,
      shows: debugShows,
    },
  };
}

async function buildMenuBarStateForBackground(): Promise<MenuBarState> {
  const token = await getTokenFromStorage();
  if (!token) {
    return {
      configured: false,
      visibleEpisodes: [],
      debug: {
        launchType: String(environment.launchType),
        activeShows: 0,
        showsWithRemaining: 0,
        disabledShows: 0,
        fetchFailedShows: 0,
        totalUnseenEpisodes: 0,
        invalidDateEpisodes: 0,
        futureEpisodes: 0,
        tooOldEpisodes: 0,
        releasedInWindowEpisodes: 0,
        trackedEpisodes: 0,
        discardedEpisodes: 0,
        pendingEpisodes: 0,
        episodesToNotify: 0,
        visibleEpisodes: 0,
        shows: [],
      },
    };
  }

  const nowMs = Date.now();
  const minReleaseTimestamp = nowMs - NOTIFICATION_WINDOW_MS;

  const [
    planningItems,
    disabledShowIds,
    storedPendingEpisodeIds,
    storedDiscardedEpisodeIds,
  ] = await Promise.all([
    getPlanning(),
    getStoredNumberIds(DISABLED_SHOW_NOTIFICATIONS_KEY),
    getStoredNumberIds(PENDING_EPISODE_IDS_KEY),
    getStoredNumberIds(DISCARDED_EPISODE_IDS_KEY),
  ]);

  let invalidDateEpisodes = 0;
  let futureEpisodes = 0;
  let tooOldEpisodes = 0;
  const releasedEpisodes: AlertEpisode[] = [];

  for (const item of planningItems) {
    const episode = toAlertEpisodeFromPlanning(item);

    if (episode.releaseTimestamp === null) {
      invalidDateEpisodes += 1;
      continue;
    }
    if (episode.releaseTimestamp > nowMs) {
      futureEpisodes += 1;
      continue;
    }
    if (episode.releaseTimestamp < minReleaseTimestamp) {
      tooOldEpisodes += 1;
      continue;
    }

    releasedEpisodes.push(episode);
  }

  releasedEpisodes.sort(compareAlertEpisodes);

  const currentWindowEpisodeIds = new Set(
    releasedEpisodes.map((episode) => episode.id),
  );
  const disabledShowIdsSet = new Set(disabledShowIds);
  const previousPendingEpisodeIdsSet = new Set(
    storedPendingEpisodeIds.filter((episodeId) =>
      currentWindowEpisodeIds.has(episodeId),
    ),
  );
  const discardedEpisodeIdsSet = new Set(
    storedDiscardedEpisodeIds.filter((episodeId) =>
      currentWindowEpisodeIds.has(episodeId),
    ),
  );

  const trackedReleasedEpisodes = releasedEpisodes.filter(
    (episode) => !disabledShowIdsSet.has(episode.showId),
  );

  const visibleEpisodes = trackedReleasedEpisodes.filter(
    (episode) => !discardedEpisodeIdsSet.has(episode.id),
  );
  const visibleEpisodeIdsSet = new Set(
    visibleEpisodes.map((episode) => episode.id),
  );
  const episodesToNotify = visibleEpisodes.filter(
    (episode) => !previousPendingEpisodeIdsSet.has(episode.id),
  );

  for (const episode of episodesToNotify) {
    await showToast({
      style: Toast.Style.Success,
      title: "New Episode Released",
      message: `${episode.showTitle} - ${episode.code}`,
      primaryAction: {
        title: "Open Episode",
        onAction: () => {
          void open(episode.url);
        },
      },
    });
  }

  await Promise.all([
    setStoredNumberIds(
      PENDING_EPISODE_IDS_KEY,
      normalizeNumberIds(Array.from(visibleEpisodeIdsSet)),
    ),
    setStoredNumberIds(
      DISCARDED_EPISODE_IDS_KEY,
      normalizeNumberIds(Array.from(discardedEpisodeIdsSet)),
    ),
  ]);

  return {
    configured: true,
    visibleEpisodes,
    debug: {
      launchType: String(environment.launchType),
      activeShows: 0,
      showsWithRemaining: 0,
      disabledShows: disabledShowIdsSet.size,
      fetchFailedShows: 0,
      totalUnseenEpisodes: planningItems.length,
      invalidDateEpisodes,
      futureEpisodes,
      tooOldEpisodes,
      releasedInWindowEpisodes: releasedEpisodes.length,
      trackedEpisodes: trackedReleasedEpisodes.length,
      discardedEpisodes:
        trackedReleasedEpisodes.length - visibleEpisodes.length,
      pendingEpisodes: previousPendingEpisodeIdsSet.size,
      episodesToNotify: episodesToNotify.length,
      visibleEpisodes: visibleEpisodes.length,
      shows: [],
    },
  };
}

export default function Command() {
  const { showMenubarDebug = false } = getPreferenceValues();
  const { data, isLoading, mutate } = usePromise(buildMenuBarState, []);

  const [locallyDiscardedEpisodeIds, setLocallyDiscardedEpisodeIds] = useState<
    Set<number>
  >(new Set());

  const configured = data?.configured ?? false;
  const visibleEpisodes = data?.visibleEpisodes ?? [];
  const debug = data?.debug;

  const effectiveVisibleEpisodes = useMemo(
    () =>
      visibleEpisodes.filter(
        (episode) => !locallyDiscardedEpisodeIds.has(episode.id),
      ),
    [visibleEpisodes, locallyDiscardedEpisodeIds],
  );

  const title =
    effectiveVisibleEpisodes.length > 0
      ? `${effectiveVisibleEpisodes.length}`
      : undefined;

  const tooltip = configured
    ? effectiveVisibleEpisodes.length > 0
      ? `${effectiveVisibleEpisodes.length} new episode notification${
          effectiveVisibleEpisodes.length > 1 ? "s" : ""
        }`
      : "No new episodes"
    : "Connect your BetaSeries account";

  const discardNotifications = async () => {
    const episodeIdsToDiscard = effectiveVisibleEpisodes.map(
      (episode) => episode.id,
    );
    if (episodeIdsToDiscard.length === 0) return;

    // Optimistic UI while the menu is still open. The command will be unloaded
    // when the item is clicked, so we also trigger a background relaunch below.
    setLocallyDiscardedEpisodeIds(
      (previous) => new Set([...previous, ...episodeIdsToDiscard]),
    );

    const storedDiscardedEpisodeIds = await getStoredNumberIds(
      DISCARDED_EPISODE_IDS_KEY,
    );

    await setStoredNumberIds(
      DISCARDED_EPISODE_IDS_KEY,
      normalizeNumberIds([
        ...storedDiscardedEpisodeIds,
        ...episodeIdsToDiscard,
      ]),
    );

    await launchCommand({
      name: "new-episodes-menubar",
      type: LaunchType.Background,
    });
  };

  const statusLabelByCode: Record<
    MenuBarState["debug"]["shows"][number]["episodeStatuses"][number]["status"],
    string
  > = {
    "invalid-date": "Invalid date",
    future: "Future",
    "too-old": "Older than 7 days",
    "disabled-show": "Show notifications disabled",
    discarded: "Discarded",
    "already-visible": "Already visible",
    "new-visible": "Newly visible",
  };

  const debugSubmenu =
    showMenubarDebug && debug ? (
      <MenuBarExtra.Submenu title="Debug" icon={Icon.Bug}>
        <MenuBarExtra.Item title={`Launch: ${debug.launchType}`} />
        <MenuBarExtra.Item
          title={`Shows: ${debug.activeShows} active / ${debug.showsWithRemaining} with remaining`}
        />
        <MenuBarExtra.Item title={`Disabled shows: ${debug.disabledShows}`} />
        <MenuBarExtra.Item
          title={`Fetch failed shows: ${debug.fetchFailedShows}`}
        />
        <MenuBarExtra.Item
          title={`Unseen episodes: ${debug.totalUnseenEpisodes}`}
        />
        <MenuBarExtra.Item
          title={`Invalid date: ${debug.invalidDateEpisodes}`}
        />
        <MenuBarExtra.Item title={`Future: ${debug.futureEpisodes}`} />
        <MenuBarExtra.Item title={`Too old: ${debug.tooOldEpisodes}`} />
        <MenuBarExtra.Item
          title={`Released in 7d: ${debug.releasedInWindowEpisodes}`}
        />
        <MenuBarExtra.Item title={`Tracked: ${debug.trackedEpisodes}`} />
        <MenuBarExtra.Item title={`Discarded: ${debug.discardedEpisodes}`} />
        <MenuBarExtra.Item title={`Pending: ${debug.pendingEpisodes}`} />
        <MenuBarExtra.Item title={`To notify now: ${debug.episodesToNotify}`} />
        <MenuBarExtra.Item title={`Visible: ${debug.visibleEpisodes}`} />
        <MenuBarExtra.Separator />
        {debug.shows.map((show) => (
          <MenuBarExtra.Submenu
            key={show.showId}
            title={`${show.showTitle} (${show.episodeStatuses.length})`}
            icon={show.fetchOk ? Icon.List : Icon.ExclamationMark}
          >
            <MenuBarExtra.Item
              title={`Tracked: ${show.tracked ? "Yes" : "No"} | Remaining: ${show.remaining}`}
            />
            {!show.fetchOk ? (
              <MenuBarExtra.Item title="Failed to fetch unseen episodes" />
            ) : show.episodeStatuses.length === 0 ? (
              <MenuBarExtra.Item title="No unseen episodes returned" />
            ) : (
              show.episodeStatuses.map((episode) => (
                <MenuBarExtra.Item
                  key={`${show.showId}-${episode.episodeId}`}
                  title={`${episode.code} - ${statusLabelByCode[episode.status]}`}
                  subtitle={episode.date || "no-date"}
                />
              ))
            )}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Submenu>
    ) : null;

  return (
    <MenuBarExtra
      icon="betaseries-menubar-v2.png"
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {!configured ? (
        <>
          <MenuBarExtra.Item title="BetaSeries account not connected" />
          <MenuBarExtra.Item
            title="Open My Shows to connect your account"
            icon={Icon.Person}
            onAction={() => {
              void launchCommand({
                name: "my-shows",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        </>
      ) : effectiveVisibleEpisodes.length === 0 ? (
        <>
          <MenuBarExtra.Item title="No new episodes" />
          {debugSubmenu && (
            <>
              <MenuBarExtra.Separator />
              {debugSubmenu}
            </>
          )}
        </>
      ) : (
        <>
          {effectiveVisibleEpisodes.map((episode) => (
            <MenuBarExtra.Item
              key={episode.id}
              title={episode.label}
              onAction={() => {
                void open(episode.url);
              }}
            />
          ))}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Discard notifications"
            icon={Icon.Trash}
            onAction={() => {
              void discardNotifications();
            }}
          />
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              void mutate();
            }}
          />
          {debugSubmenu && (
            <>
              <MenuBarExtra.Separator />
              {debugSubmenu}
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
