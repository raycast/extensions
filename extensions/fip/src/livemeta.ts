export type Track = {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  label?: string;
  coverUrl?: string;
  start: Date;
  end: Date;
};

export type Timeline = {
  previous?: Track;
  current?: Track;
  next?: Track;
};

export type TimelinePosition = keyof Timeline;

type PullStep = {
  title: string;
  start: number;
  end: number;
  embedType: string;
  authors?: string | null;
  highlightedArtists?: string[] | null;
  titreAlbum?: string | null;
  anneeEditionMusique?: number | null;
  label?: string | null;
  coverUuid?: string | null;
};

export type PullResponse = {
  steps: Record<string, PullStep>;
  levels: { items: string[]; position: number }[];
};

type LiveItem = {
  firstLine: string;
  secondLine: string;
  cover?: string | null;
  startTime: number | null;
  endTime: number | null;
};

export type LiveResponse = {
  prev: LiveItem[];
  now: LiveItem;
  next: LiveItem[];
  delayToRefresh?: number;
};

export type Snapshot = {
  tracks: Track[];
  refreshIn: number;
};

const LIVEMETA_URL = "https://api.radiofrance.fr/livemeta";

const MIN_REFRESH_DELAY = 10_000;

const fromUnix = (seconds: number) => new Date(seconds * 1000);

const coverUrl = (uuid: string | null | undefined) =>
  uuid ? `https://www.radiofrance.fr/pikapi/images/${uuid}/400x400` : undefined;

export function tracksFromPull({ steps, levels }: PullResponse): Track[] {
  return levels
    .flatMap((level) => level.items)
    .map((stepId) => steps[stepId])
    .filter((step) => step?.embedType === "song")
    .map((step) => ({
      title: step.title,
      artist: step.highlightedArtists?.length ? step.highlightedArtists.join(", ") : (step.authors ?? ""),
      album: step.titreAlbum ?? undefined,
      year: step.anneeEditionMusique ?? undefined,
      label: step.label ?? undefined,
      coverUrl: coverUrl(step.coverUuid),
      start: fromUnix(step.start),
      end: fromUnix(step.end),
    }));
}

export function tracksFromLive({ prev, now, next }: LiveResponse): Track[] {
  return [...prev, now, ...next].flatMap(({ firstLine, secondLine, cover, startTime, endTime }) =>
    startTime === null || endTime === null
      ? []
      : [
          {
            title: firstLine,
            artist: secondLine,
            coverUrl: coverUrl(cover),
            start: fromUnix(startTime),
            end: fromUnix(endTime),
          },
        ],
  );
}

// Radio France's servers disagree for a while after a song changes: some still answer with
// placeholders and ask to be polled again after a short delay, like its own player does.
export function refreshDelay({ delayToRefresh }: LiveResponse): number {
  return Math.max(delayToRefresh ?? 0, MIN_REFRESH_DELAY);
}

// Songs start and end at known times: poll again then rather than show a finished song as airing.
export function nextPollDelay(tracks: Track[], now: Date, serverDelay: number): number {
  const untilChanges = tracks
    .flatMap((track) => [track.start.getTime() - now.getTime(), track.end.getTime() - now.getTime()])
    .filter((delay) => delay > 0);
  return Math.min(serverDelay, ...untilChanges);
}

// Both feeds report a song with the same start time, so the start time identifies it.
export function mergeTracks(timeline: Track[], live: Track[]): Track[] {
  const known = new Set(timeline.map((track) => track.start.getTime()));
  return [...timeline, ...live.filter((track) => !known.has(track.start.getTime()))];
}

// Positions come from the clock rather than from the payload's slots: livemeta replicas
// sometimes lag and still announce as "next" a song that is already airing or over.
export function timelineAt(tracks: Track[], now: Date): Timeline {
  const sorted = tracks.toSorted((a, b) => a.start.getTime() - b.start.getTime());
  const airing = sorted.findLastIndex((track) => track.start <= now && now < track.end);
  if (airing !== -1) {
    return { previous: sorted[airing - 1], current: sorted[airing], next: sorted[airing + 1] };
  }
  const upcoming = sorted.findIndex((track) => track.start > now);
  const split = upcoming === -1 ? sorted.length : upcoming;
  return { previous: sorted[split - 1], next: sorted[split] };
}

async function fetchTimelineTracks(stationId: string): Promise<Track[]> {
  const response = await fetch(`${LIVEMETA_URL}/pull/${stationId}`);
  // Only the older webradios keep a timeline; the newer ones publish the current and next songs alone.
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Radio France answered ${response.status} ${response.statusText}`);
  }
  return tracksFromPull((await response.json()) as PullResponse);
}

async function fetchLive(stationId: string): Promise<LiveResponse> {
  const response = await fetch(`${LIVEMETA_URL}/live/${stationId}/webrf_webradio_player`);
  if (!response.ok) {
    throw new Error(`Radio France answered ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as LiveResponse;
}

// The timeline has the album details but lags minutes behind the live feed on webradios.
export async function fetchSnapshot(stationId: string): Promise<Snapshot> {
  const [timeline, live] = await Promise.all([fetchTimelineTracks(stationId), fetchLive(stationId)]);
  return { tracks: mergeTracks(timeline, tracksFromLive(live)), refreshIn: refreshDelay(live) };
}
