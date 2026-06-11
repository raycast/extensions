import { useCallback, useEffect, useState } from "react";

import { getMetadataByKeyForTimeline, getMetadataByRatingKey, getPlayQueueForTimeline, getTimeline } from "./plex";
import type {
  AudioPlaylist,
  MetadataItem,
  MusicAlbum,
  MusicArtist,
  MusicTrack,
  PlayQueueInfo,
  TimelineInfo,
} from "./types";

export interface NowPlayingControlsState {
  timeline: TimelineInfo;
  queue?: PlayQueueInfo;
  current?: MetadataItem;
}

function areArtistsEqual(left?: MusicArtist, right?: MusicArtist): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.ratingKey === right.ratingKey &&
    left.key === right.key &&
    left.browseKey === right.browseKey &&
    left.title === right.title &&
    left.summary === right.summary &&
    left.thumb === right.thumb
  );
}

function areAlbumsEqual(left?: MusicAlbum, right?: MusicAlbum): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.ratingKey === right.ratingKey &&
    left.key === right.key &&
    left.browseKey === right.browseKey &&
    left.title === right.title &&
    left.parentTitle === right.parentTitle &&
    left.year === right.year &&
    left.leafCount === right.leafCount &&
    left.duration === right.duration &&
    left.releaseType === right.releaseType &&
    left.releaseSubType === right.releaseSubType &&
    left.thumb === right.thumb
  );
}

function areTracksEqual(left?: MusicTrack, right?: MusicTrack): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.ratingKey === right.ratingKey &&
    left.key === right.key &&
    left.title === right.title &&
    left.userRating === right.userRating &&
    left.parentRatingKey === right.parentRatingKey &&
    left.parentTitle === right.parentTitle &&
    left.grandparentRatingKey === right.grandparentRatingKey &&
    left.grandparentTitle === right.grandparentTitle &&
    left.librarySectionKey === right.librarySectionKey &&
    left.audioFormat === right.audioFormat &&
    left.bitrate === right.bitrate &&
    left.duration === right.duration &&
    left.index === right.index &&
    left.parentIndex === right.parentIndex &&
    left.thumb === right.thumb &&
    left.playQueueItemID === right.playQueueItemID
  );
}

function arePlaylistsEqual(left?: AudioPlaylist, right?: AudioPlaylist): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.ratingKey === right.ratingKey &&
    left.key === right.key &&
    left.browseKey === right.browseKey &&
    left.title === right.title &&
    left.leafCount === right.leafCount &&
    left.librarySectionKey === right.librarySectionKey &&
    left.thumb === right.thumb
  );
}

function areMetadataItemsEqual(left?: MetadataItem, right?: MetadataItem): boolean {
  if (!left || !right) {
    return left === right;
  }

  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case "artist":
      return areArtistsEqual(left, right as MusicArtist);
    case "album":
      return areAlbumsEqual(left, right as MusicAlbum);
    case "track":
      return areTracksEqual(left, right as MusicTrack);
    case "playlist":
      return arePlaylistsEqual(left, right as AudioPlaylist);
  }
}

function areTimelinesEqual(left: TimelineInfo, right: TimelineInfo): boolean {
  return (
    left.state === right.state &&
    left.key === right.key &&
    left.ratingKey === right.ratingKey &&
    left.machineIdentifier === right.machineIdentifier &&
    left.address === right.address &&
    left.port === right.port &&
    left.protocol === right.protocol &&
    left.time === right.time &&
    left.duration === right.duration &&
    left.playQueueID === right.playQueueID &&
    left.playQueueItemID === right.playQueueItemID &&
    left.volume === right.volume &&
    left.repeat === right.repeat &&
    left.shuffle === right.shuffle
  );
}

function arePlayQueuesEqual(left?: PlayQueueInfo, right?: PlayQueueInfo): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.id === right.id &&
    left.version === right.version &&
    left.selectedItemID === right.selectedItemID &&
    left.selectedKey === right.selectedKey &&
    left.items.length === right.items.length &&
    left.items.every((item, index) => areTracksEqual(item, right.items[index]))
  );
}

function areNowPlayingStatesEqual(left: NowPlayingControlsState, right: NowPlayingControlsState): boolean {
  return (
    areTimelinesEqual(left.timeline, right.timeline) &&
    arePlayQueuesEqual(left.queue, right.queue) &&
    areMetadataItemsEqual(left.current, right.current)
  );
}

async function loadNowPlayingState(): Promise<{
  nextState: NowPlayingControlsState;
  warning?: string;
}> {
  const timeline = await getTimeline();
  let queue: PlayQueueInfo | undefined;
  let current: MetadataItem | undefined = timeline.current;
  const warnings: string[] = [];

  if (timeline.playQueueID) {
    try {
      queue = await getPlayQueueForTimeline(timeline, { window: 200 });
    } catch (queueError) {
      warnings.push(queueError instanceof Error ? queueError.message : String(queueError));
    }
  }

  const currentFromQueue = queue?.items.find((item) => item.playQueueItemID === timeline.playQueueItemID);

  if (currentFromQueue) {
    current = currentFromQueue;
  }

  if (!current && timeline.key) {
    try {
      current = await getMetadataByKeyForTimeline(timeline, timeline.key);
    } catch (metadataError) {
      warnings.push(metadataError instanceof Error ? metadataError.message : String(metadataError));
    }
  }

  if (!current && timeline.ratingKey) {
    try {
      current = await getMetadataByRatingKey(timeline.ratingKey);
    } catch (metadataError) {
      warnings.push(metadataError instanceof Error ? metadataError.message : String(metadataError));
    }
  }

  return {
    nextState: { timeline, queue, current },
    warning: warnings[0],
  };
}

export function useNowPlayingState(enabled: boolean) {
  const [state, setState] = useState<NowPlayingControlsState>({
    timeline: { state: "loading" },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;

    if (!background) {
      setIsLoading(true);
      setError(undefined);
    }

    try {
      const { nextState, warning } = await loadNowPlayingState();

      setState((currentState) => (areNowPlayingStatesEqual(currentState, nextState) ? currentState : nextState));
      setError((currentError) => (currentError === warning ? currentError : warning));
    } catch (loadError) {
      const nextError = loadError instanceof Error ? loadError.message : String(loadError);

      setError((currentError) => (currentError === nextError ? currentError : nextError));
      setState((currentState) =>
        currentState.timeline.state === "error"
          ? currentState
          : {
              ...currentState,
              timeline: { state: "error" },
            },
      );
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void reload();
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => {
      void reload({ background: true });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, reload]);

  return {
    state,
    isLoading,
    error,
    reload,
  };
}
