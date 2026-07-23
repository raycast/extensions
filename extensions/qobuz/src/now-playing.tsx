import { Cache, Clipboard, getPreferenceValues, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { defaultPlayerStatePath, type QobuzClient, type Track } from "@kud/qobuz";
import { readFile } from "node:fs/promises";
import { appLink, deepLink, getClient } from "./lib/client";
import { sendMediaKey } from "./lib/media-keys";

const QUEUE_PREVIEW = 3;
const HISTORY_PREVIEW = 3;

// Keep the menu-bar title from eating the whole bar on long titles.
const DEFAULT_TITLE_LENGTH = 45;
const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const titleLength = (): number => {
  const { titleLength } = getPreferenceValues<Preferences.NowPlaying>();
  const parsed = Number(titleLength);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TITLE_LENGTH;
};

// Track metadata (title, artist, art) never changes, so cache it by id. This
// keeps the frequent menu-bar poll cheap: a steady-playing track and an
// unchanged queue are served entirely from cache, hitting the network only
// when a genuinely new track appears.
const cache = new Cache();

const fetchTrack = async (client: QobuzClient, id: number): Promise<Track | null> => {
  const key = `track-${id}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached) as Track;
  const track = await client.tracks.get(id).catch(() => null);
  if (track) cache.set(key, JSON.stringify(track));
  return track;
};

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const client = await getClient();

    let currentId: number | undefined;
    let nextIds: number[] = [];
    let histIds: number[] = [];

    try {
      const state = JSON.parse(await readFile(defaultPlayerStatePath(), "utf8"));
      const queue = state?.playqueue?.data;
      const activeList = queue?.shuffled ? queue?.shuffledItems : queue?.items;
      const idx: number = queue?.currentIndex ?? 0;
      currentId = activeList?.[idx]?.trackId;
      nextIds = (activeList ?? []).slice(idx + 1, idx + 1 + QUEUE_PREVIEW).map((i: { trackId: number }) => i.trackId);
      histIds = (queue?.history ?? []).slice(0, HISTORY_PREVIEW).map((i: { trackId: number }) => i.trackId);
    } catch {
      // player state absent — controls still work
    }

    const [current, nextResults, histResults] = await Promise.all([
      currentId !== undefined ? fetchTrack(client, currentId) : Promise.resolve(null),
      Promise.all(nextIds.map((id) => fetchTrack(client, id))),
      Promise.all(histIds.map((id) => fetchTrack(client, id))),
    ]);

    return {
      current: current ?? undefined,
      nextTracks: nextResults.filter(Boolean) as Track[],
      histTracks: histResults.filter(Boolean) as Track[],
    };
  });

  const control = (key: Parameters<typeof sendMediaKey>[0]) => async () => {
    try {
      await sendMediaKey(key);
    } catch {
      await showHUD("Couldn't control Qobuz — grant Accessibility permission");
    }
    // The menu-bar repaints on its interval — Raycast tears this command down
    // when the menu closes, so there's no reliable way to refresh it sooner.
  };

  const trackIcon = (track: Track) => (track.album?.image?.small ? { source: track.album.image.small } : Icon.Music);

  const title = data?.current
    ? truncate(`${data.current.artist?.name ?? "?"} — ${data.current.title}`, titleLength())
    : undefined;

  return (
    <MenuBarExtra icon={Icon.Music} title={title} isLoading={isLoading} tooltip="Qobuz — Now Playing">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Play / Pause" icon={Icon.Play} onAction={control("play")} />
        <MenuBarExtra.Item title="Next" icon={Icon.Forward} onAction={control("next")} />
        <MenuBarExtra.Item title="Previous" icon={Icon.Rewind} onAction={control("previous")} />
      </MenuBarExtra.Section>

      {(data?.nextTracks.length ?? 0) > 0 && (
        <MenuBarExtra.Section title="Up Next">
          {data!.nextTracks.map((track, index) => (
            <MenuBarExtra.Item
              key={`next-${index}-${track.id}`}
              title={track.title}
              subtitle={track.artist?.name}
              icon={trackIcon(track)}
              onAction={() => open(appLink.track(track.id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {(data?.histTracks.length ?? 0) > 0 && (
        <MenuBarExtra.Section title="History">
          {data!.histTracks.map((track, index) => (
            <MenuBarExtra.Item
              key={`hist-${index}-${track.id}`}
              title={track.title}
              subtitle={track.artist?.name}
              icon={trackIcon(track)}
              onAction={() => open(appLink.track(track.id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {data?.current && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Copy Share Link"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(deepLink.track(data.current!.id));
              await showHUD("Copied share link");
            }}
          />
          <MenuBarExtra.Item
            title="Open in Qobuz"
            icon={Icon.ArrowNe}
            onAction={() => open(appLink.track(data.current!.id))}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Qobuz" icon={Icon.Window} onAction={() => open("qobuzapp://")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
