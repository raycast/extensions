import {
  ActionPanel,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Action,
  Color,
  Cache,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  PauseAction,
  PlayAction,
  SwitchAction,
  RevealApplicationAction,
  PreviousTrackAction,
  NextTrackAction,
  CopyTrackInfoAction,
  VolumeUpAction,
  VolumeDownAction,
  RefreshAction,
  ToggleDetailAction,
  TogglePinAction,
} from "./components/Actions";
import {
  list_sessions,
  scan_shortcuts,
  packaged_app_icon_for,
  session_thumbnail,
  type ShortcutEntry,
  type SessionThumbnail,
  type MediaSessionInfo,
} from "rust:../rust";

const MAX_SAFE_STEP = 100;

const cache = new Cache();
const SHORTCUTS_KEY = "shortcuts-v1";
const ICONS_KEY = "icons-v1";
const PINNED_KEY = "pinned-app-ids";
// 7-day map TTL; misses rescan after a 1-hour cooldown.
const SHORTCUTS_TTL_MS = 7 * 24 * 3600 * 1000;
const ICONS_TTL_MS = 7 * 24 * 3600 * 1000;
const RESCAN_COOLDOWN_MS = 3600 * 1000;
const SETTLE_MS = 30000;
const SETTLE_TICK_MS = 2000;

type ShortcutMaps = { by_exe: Record<string, string>; by_name: Record<string, string> };

function buildShortcutMaps(entries: ShortcutEntry[]): ShortcutMaps {
  const by_exe: Record<string, string> = {};
  const by_name: Record<string, string> = {};
  for (const e of entries) {
    by_exe[e.exe_path.toLowerCase()] ??= e.name;
    by_name[e.name.toLowerCase()] ??= e.exe_path;
  }
  return { by_exe, by_name };
}

function readShortcuts(): { entries: ShortcutEntry[]; ts: number } | undefined {
  try {
    const raw = cache.get(SHORTCUTS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { entries: ShortcutEntry[]; ts: number };
    if (!Array.isArray(parsed.entries) || typeof parsed.ts !== "number") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function getShortcuts(): Promise<ShortcutMaps> {
  const cached = readShortcuts();
  if (cached && Date.now() - cached.ts < SHORTCUTS_TTL_MS) return buildShortcutMaps(cached.entries);
  const entries = await scan_shortcuts();
  cache.set(SHORTCUTS_KEY, JSON.stringify({ entries, ts: Date.now() }));
  return buildShortcutMaps(entries);
}

async function refreshShortcutsIfStale(): Promise<ShortcutMaps | undefined> {
  const cached = readShortcuts();
  if (cached && Date.now() - cached.ts < RESCAN_COOLDOWN_MS) return buildShortcutMaps(cached.entries);
  try {
    const entries = await scan_shortcuts();
    cache.set(SHORTCUTS_KEY, JSON.stringify({ entries, ts: Date.now() }));
    return buildShortcutMaps(entries);
  } catch {
    return cached && buildShortcutMaps(cached.entries);
  }
}

function readIcons(): { icons: Record<string, string>; ts: number } | undefined {
  try {
    const raw = cache.get(ICONS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { icons: Record<string, string>; ts: number };
    if (!parsed.icons || typeof parsed.ts !== "number") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function enrichSessions<T extends { app_id: string; app_name: string; exe_path: string; icon_path: string }>(
  sessions: T[],
): Promise<T[]> {
  if (sessions.length === 0) return sessions;
  const needsNames = sessions.some((s) => s.exe_path);
  const needsExe = sessions.some((s) => !s.exe_path && !s.app_id.includes("!"));
  const unknownIcons = sessions.filter((s) => s.app_id.includes("!") && !s.icon_path).map((s) => s.app_id);

  let maps: ShortcutMaps | undefined;
  if (needsNames || needsExe) {
    try {
      maps = await getShortcuts();
    } catch {
      maps = undefined;
    }
  }

  if (maps && (needsNames || needsExe)) {
    const miss =
      (needsNames && sessions.some((s) => s.exe_path && !maps?.by_exe[s.exe_path.toLowerCase()])) ||
      (needsExe &&
        sessions.some((s) => !s.exe_path && !s.app_id.includes("!") && !maps?.by_name[s.app_name.toLowerCase()]));
    if (miss) maps = (await refreshShortcutsIfStale()) ?? maps;
  }

  // Icon paths go stale when a Store app updates (package folder moves) and
  // empty results may have been transient failures: re-resolve weekly.
  const storedIcons = readIcons();
  const icons: Record<string, string> = {};
  let iconsTs = Date.now();
  if (storedIcons && Date.now() - storedIcons.ts < ICONS_TTL_MS) {
    Object.assign(icons, storedIcons.icons);
    iconsTs = storedIcons.ts;
  }
  const missingIcons = unknownIcons.filter((id) => !(id in icons));
  if (missingIcons.length > 0) {
    await Promise.all(
      missingIcons.map(async (id) => {
        try {
          icons[id] = await packaged_app_icon_for(id);
        } catch {
          icons[id] = "";
        }
      }),
    );
    cache.set(ICONS_KEY, JSON.stringify({ icons, ts: iconsTs }));
  }

  return sessions.map((s) => {
    let { app_name, exe_path, icon_path } = s;
    if (maps) {
      if (exe_path) {
        const name = maps.by_exe[exe_path.toLowerCase()];
        if (name) app_name = name;
      } else if (!s.app_id.includes("!")) {
        const exe = maps.by_name[app_name.toLowerCase()];
        if (exe) exe_path = exe;
      }
    }
    if (!icon_path && s.app_id in icons) icon_path = icons[s.app_id];
    return { ...s, app_name, exe_path, icon_path };
  });
}

function thumbKey(app_id: string, session_index: number, title: string, artist: string) {
  return `${app_id}-${session_index}-${title}-${artist}`;
}

function escapeMarkdown(s: string) {
  return s.replace(/[\r\n]+/g, " ").replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function detailMarkdown(title: string, artist: string, appName: string, thumb: SessionThumbnail | undefined) {
  const t = escapeMarkdown(title || "No title");
  const a = escapeMarkdown(artist || appName);
  // Titles past ~3 lines (landscape) or ~1 line (square/portrait) shrink
  // one heading level. No art, no constraint.
  const landscape = thumb && thumb.width > thumb.height * 1.1;
  const wide = landscape ? t.length > 90 : thumb ? t.length > 30 : false;
  const heading = wide ? "##" : "#";
  let img = "";
  if (thumb?.path) {
    // Content-addressed path: new art is a new URL by construction.
    const url = `file:///${encodeURI(thumb.path.replaceAll("\\", "/"))}`;
    // Near-target art renders at native pixels; tiny art upscales.
    const fit = (target: number, native: number) => (native >= target * 0.75 ? Math.min(target, native) : target);
    let size = "raycast-width=250";
    if (thumb.width > 0 && thumb.height > 0) {
      if (thumb.width > thumb.height * 1.1) size = `raycast-width=${fit(350, thumb.width)}`;
      else if (thumb.height > thumb.width * 1.1) size = `raycast-height=${fit(250, thumb.height)}`;
      else size = `raycast-width=${fit(250, thumb.width)}`;
    }
    img = `\n![](${url}?${size})`;
  }
  return `${heading} ${t}\n> ${a}\n${img}`;
}

export default function Command() {
  const {
    isLoading,
    data: rawSessions,
    revalidate,
  } = useCachedPromise(async () => {
    return list_sessions();
  }, []);
  // Last good list renders across refreshes so polling never flashes.
  const [sessions, setSessions] = useState<typeof rawSessions>(undefined);
  const lastGood = useRef<typeof rawSessions>(undefined);
  useEffect(() => {
    let live = true;
    (async () => {
      if (!rawSessions) return;
      try {
        const enriched = await enrichSessions(rawSessions);
        if (!live) return;
        lastGood.current = enriched;
        setSessions(enriched);
      } catch {
        if (!live) return;
        lastGood.current = rawSessions;
        setSessions(rawSessions);
      }
    })();
    return () => {
      live = false;
    };
  }, [rawSessions]);
  const shown = sessions ?? lastGood.current;
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", true);
  // Pinned app IDs live in LocalStorage, not Cache: pins are user data and
  // must survive a cache clear.
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => {
    LocalStorage.getItem<string>(PINNED_KEY).then((v) => {
      try {
        const parsed: unknown = v ? JSON.parse(v) : [];
        if (Array.isArray(parsed)) setPinned(parsed.filter((x): x is string => typeof x === "string"));
      } catch {
        /* keep default */
      }
    });
  }, []);
  const togglePin = async (appId: string) => {
    const next = pinned.includes(appId) ? pinned.filter((id) => id !== appId) : [...pinned, appId];
    setPinned(next);
    await LocalStorage.setItem(PINNED_KEY, JSON.stringify(next));
  };
  const [thumbs, setThumbs] = useState<Record<string, SessionThumbnail>>({});
  const thumbsRef = useRef(thumbs);
  thumbsRef.current = thumbs;
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // Titles publish before art: re-check new tracks fast until a flip is
  // seen (or the window expires) instead of waiting for polls.
  const settlingRef = useRef<Record<string, { init: string | null; until: number }>>({});
  useEffect(() => {
    if (!shown || shown.length === 0) return;
    let live = true;
    // Gone sessions' files are cleaned up on the next slot write, so drop
    // references nothing rendered may still point at.
    const liveKeys = new Set(
      shown
        .filter((s) => s.title.trim() || s.artist.trim())
        .map((s) => thumbKey(s.app_id, s.session_index, s.title, s.artist)),
    );
    const kept: Record<string, SessionThumbnail> = {};
    for (const k of liveKeys) if (k in thumbsRef.current) kept[k] = thumbsRef.current[k];
    setThumbs(kept);
    thumbsRef.current = kept;
    for (const k of Object.keys(settlingRef.current)) {
      if (!liveKeys.has(k)) delete settlingRef.current[k];
    }
    const fetchThumbs = async (sessions: typeof shown) => {
      // Settling keys re-fetch even when already present: the first fetch
      // may have caught pre-arrival art or a transient error.
      const due = (sessions ?? []).filter((s) => {
        if (!(s.title.trim() || s.artist.trim())) return false;
        const k = thumbKey(s.app_id, s.session_index, s.title, s.artist);
        return !(k in thumbsRef.current) || k in settlingRef.current;
      });
      if (due.length === 0) return;
      const entries = await Promise.all(
        due.map(async (s) => {
          const key = thumbKey(s.app_id, s.session_index, s.title, s.artist);
          try {
            const thumb = await session_thumbnail(s.app_id, s.session_index, s.title, s.artist);
            // Empty results never clobber displayed art: mid-transition
            // reads routinely come back artless, and cementing blank would
            // stick until the track changes.
            if (thumb.path) return [key, thumb] as const;
            return [key, thumbsRef.current[key] ?? thumb] as const;
          } catch {
            // Never clobber good art with a transient failure.
            return [key, thumbsRef.current[key] ?? { path: "", width: 0, height: 0, hash: "" }] as const;
          }
        }),
      );
      if (!live) return;
      setThumbs((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
      const now = Date.now();
      for (const [k, v] of entries) {
        const e = settlingRef.current[k];
        if (!e) continue;
        if (e.init === null) e.init = v.hash;
        else if (v.hash !== e.init || now > e.until) delete settlingRef.current[k];
      }
    };
    // Register genuinely new tracks only. Settled or expired keys stay out:
    // re-adding them would resurrect the fast lane on every refresh.
    const now = Date.now();
    for (const s of shown) {
      if (!(s.title.trim() || s.artist.trim())) continue;
      const k = thumbKey(s.app_id, s.session_index, s.title, s.artist);
      if (!(k in thumbsRef.current)) settlingRef.current[k] ??= { init: null, until: now + SETTLE_MS };
    }
    // One fetch at a time: overlapping runs can complete out of order, and
    // a stale winner would stick (its key may already have settled).
    let fetching = false;
    const guardedFetch = (sessions: typeof shown) => {
      if (fetching) return;
      fetching = true;
      void fetchThumbs(sessions).finally(() => {
        fetching = false;
      });
    };
    guardedFetch(shown);
    // Pruning also lives in the tick below so a disabled auto-refresh
    // can't leak the interval into forever.
    const id = setInterval(() => {
      if (!live) return;
      const cur = shownRef.current ?? [];
      const targets = cur.filter((s) => thumbKey(s.app_id, s.session_index, s.title, s.artist) in settlingRef.current);
      if (targets.length > 0) {
        guardedFetch(targets);
        return;
      }
      const n = Date.now();
      for (const k of Object.keys(settlingRef.current)) {
        if (n > settlingRef.current[k].until) delete settlingRef.current[k];
      }
    }, SETTLE_TICK_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [shown]);
  const prefs = getPreferenceValues<Preferences>();
  const groupPlaying = prefs.groupPlayingSessions ?? false;
  const refreshSeconds = Math.max(0, parseInt(prefs.refreshInterval ?? "0", 10) || 0);
  const volStep = Math.min(MAX_SAFE_STEP, Math.max(1, parseInt(prefs.volumeStep ?? "5", 10) || 5));

  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (refreshSeconds <= 0) return;
    const id = setInterval(() => {
      if (!isLoadingRef.current) {
        revalidate();
      }
    }, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [refreshSeconds, revalidate]);

  // Pinned rows always lead, even above Playing. Without pins and grouping
  // off, the list stays exactly as flat as before.
  const pinnedSet = new Set(pinned);
  const pinnedRows = shown?.filter((s) => pinnedSet.has(s.app_id)) ?? [];
  const restRows = shown?.filter((s) => !pinnedSet.has(s.app_id)) ?? [];
  const playingRows = groupPlaying ? restRows.filter((s) => s.is_playing) : [];
  const otherRows = groupPlaying ? restRows.filter((s) => !s.is_playing) : restRows;
  const sectioned = groupPlaying || pinnedRows.length > 0;
  const renderRow = (session: MediaSessionInfo) => {
    const hasIdentity = Boolean(session.title.trim() || session.artist.trim());
    const isPinned = pinnedSet.has(session.app_id);
    return (
      <List.Item
        key={`${session.app_id}-${session.session_index}`}
        icon={
          session.icon_path
            ? {
                value: { source: `file:///${session.icon_path}` },
                tooltip: isShowingDetail ? "" : session.app_name,
              }
            : session.exe_path
              ? { value: { fileIcon: session.exe_path }, tooltip: isShowingDetail ? "" : session.app_name }
              : { value: Icon.Music, tooltip: isShowingDetail ? "" : session.app_name }
        }
        title={
          isShowingDetail
            ? session.app_name
            : session.title
              ? { value: session.title, tooltip: session.title }
              : "No title"
        }
        subtitle={
          isShowingDetail
            ? undefined
            : session.artist
              ? { value: session.artist, tooltip: session.artist }
              : { value: session.app_name, tooltip: session.app_name }
        }
        keywords={[session.title, session.app_name, session.artist]}
        accessories={
          isShowingDetail
            ? [
                {
                  icon: session.is_playing ? { source: Icon.Waveform, tintColor: Color.Green } : Icon.Pause,
                  tooltip: session.is_playing ? "Playing" : "Paused",
                },
              ]
            : [
                {
                  icon: session.is_playing ? { source: Icon.Waveform, tintColor: Color.Green } : Icon.Pause,
                  text: session.is_playing ? { value: "Playing", color: Color.Green } : "Paused",
                },
              ]
        }
        actions={
          <ActionPanel>
            {hasIdentity ? (
              <>
                {session.is_playing ? (
                  <ActionPanel.Section>
                    <PauseAction
                      appId={session.app_id}
                      sessionIndex={session.session_index}
                      titlePrefix={session.title}
                      artistPrefix={session.artist}
                      revalidate={revalidate}
                    />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section>
                    {shown?.some((s) => s.is_playing) && (
                      <SwitchAction
                        appId={session.app_id}
                        sessionIndex={session.session_index}
                        titlePrefix={session.title}
                        artistPrefix={session.artist}
                        revalidate={revalidate}
                      />
                    )}
                    <PlayAction
                      appId={session.app_id}
                      sessionIndex={session.session_index}
                      titlePrefix={session.title}
                      artistPrefix={session.artist}
                      revalidate={revalidate}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <PreviousTrackAction
                    appId={session.app_id}
                    sessionIndex={session.session_index}
                    titlePrefix={session.title}
                    artistPrefix={session.artist}
                    revalidate={revalidate}
                  />
                  <NextTrackAction
                    appId={session.app_id}
                    sessionIndex={session.session_index}
                    titlePrefix={session.title}
                    artistPrefix={session.artist}
                    revalidate={revalidate}
                  />
                </ActionPanel.Section>
              </>
            ) : (
              <ActionPanel.Section>
                <Action
                  title="Playback Unavailable"
                  icon={Icon.Info}
                  onAction={async () => {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "No playback control",
                      message:
                        "This session reports no title or artist, so it cannot be reliably identified. Refresh and try again.",
                    });
                  }}
                />
              </ActionPanel.Section>
            )}
            <ActionPanel.Section>
              <RevealApplicationAction appId={session.app_id} exePath={session.exe_path} iconPath={session.icon_path} />
              <CopyTrackInfoAction title={session.title} artist={session.artist} />
              <TogglePinAction isPinned={isPinned} togglePin={togglePin} sessionAppId={session.app_id} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <VolumeUpAction volStep={volStep} />
              <VolumeDownAction volStep={volStep} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
              <RefreshAction revalidate={revalidate} />
            </ActionPanel.Section>
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={detailMarkdown(
              session.title,
              session.artist,
              session.app_name,
              thumbs[thumbKey(session.app_id, session.session_index, session.title, session.artist)] || undefined,
            )}
          />
        }
      />
    );
  };
  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search media sessions…">
      {shown?.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Play}
          title="No media sessions found"
          description="Open a media app (Spotify, browser, etc.) to see it here"
        />
      )}
      {!sectioned ? (
        shown?.map(renderRow)
      ) : (
        <>
          {pinnedRows.length > 0 && <List.Section title="Pinned">{pinnedRows.map(renderRow)}</List.Section>}
          {playingRows.length > 0 && <List.Section title="Playing">{playingRows.map(renderRow)}</List.Section>}
          {otherRows.length > 0 && <List.Section title="Sessions">{otherRows.map(renderRow)}</List.Section>}
        </>
      )}
    </List>
  );
}
