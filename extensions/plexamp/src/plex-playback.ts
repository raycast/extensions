import { getConfig, registerConfigInvalidator, requireServerConfig } from "./plex-config";
import {
  parseMetadataItem,
  parseMetadataNode,
  parsePlayQueue,
  type XmlNode,
  asString,
  asNumber,
  arrayify,
} from "./plex-parsing";
import {
  getTimelineServerBaseUrl,
  isRequestStatusError,
  requestPlayQueueViaPlayer,
  requestPlayer,
  requestServer,
  requestServerWithConnection,
  requestTimelineServer,
} from "./plex-request";
import { getMetadataByKeyForTimeline, getMetadataByRatingKey } from "./plex-library";
import type { MusicTrack, PlayQueueInfo, PlayableItem, TimelineInfo } from "./types";

interface ServerIdentity {
  machineIdentifier: string;
  address: string;
  port: string;
  protocol: string;
}

let serverIdentityPromise: Promise<ServerIdentity> | undefined;

registerConfigInvalidator(() => {
  serverIdentityPromise = undefined;
});

async function getServerIdentity(): Promise<ServerIdentity> {
  if (!serverIdentityPromise) {
    serverIdentityPromise = (async () => {
      const config = await requireServerConfig();
      const baseUrl = new URL(config.plexServerUrl);

      let machineIdentifier = config.serverMachineIdentifier;

      if (!machineIdentifier) {
        machineIdentifier = asString((await requestServer("/")).machineIdentifier);
      }

      if (!machineIdentifier) {
        machineIdentifier = asString((await requestServer("/identity")).machineIdentifier);
      }

      if (!machineIdentifier) {
        throw new Error("Unable to determine Plex server machine identifier.");
      }

      return {
        machineIdentifier,
        address: baseUrl.hostname,
        port: baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80"),
        protocol: baseUrl.protocol.replace(":", ""),
      };
    })().catch((error) => {
      serverIdentityPromise = undefined;
      throw error;
    });
  }

  return serverIdentityPromise;
}

function buildPlayableUri(machineIdentifier: string, item: PlayableItem): string {
  if (item.type === "playlist") {
    return "";
  }

  return `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${item.ratingKey}`;
}

export async function getTimeline(): Promise<TimelineInfo> {
  const container = await requestPlayer("/player/timeline/poll", { wait: "0" });
  const timelines = arrayify(container.Timeline).filter((node): node is XmlNode => typeof node === "object");
  const musicTimeline = timelines.find((timeline) => asString(timeline.type) === "music") ?? timelines[0];

  if (!musicTimeline) {
    return { state: "stopped" };
  }

  return {
    state: asString(musicTimeline.state) ?? "stopped",
    key: asString(musicTimeline.key),
    ratingKey: asString(musicTimeline.ratingKey),
    current: parseMetadataNode(musicTimeline) ?? parseMetadataItem(container),
    machineIdentifier: asString(musicTimeline.machineIdentifier),
    address: asString(musicTimeline.address),
    port: asString(musicTimeline.port),
    protocol: asString(musicTimeline.protocol),
    time: asNumber(musicTimeline.time),
    duration: asNumber(musicTimeline.duration),
    playQueueID: asString(musicTimeline.playQueueID),
    playQueueItemID: asString(musicTimeline.playQueueItemID),
    volume: asNumber(musicTimeline.volume),
    repeat: asString(musicTimeline.repeat),
    shuffle: asString(musicTimeline.shuffle),
  };
}

export async function getPlayQueue(
  playQueueId: string,
  options?: {
    window?: number;
    includeBefore?: number;
    includeAfter?: number;
  },
): Promise<PlayQueueInfo> {
  const params = new URLSearchParams({ own: "1" });

  if (options?.window !== undefined) {
    params.set("window", String(options.window));
  }

  if (options?.includeBefore !== undefined) {
    params.set("includeBefore", String(options.includeBefore));
  }

  if (options?.includeAfter !== undefined) {
    params.set("includeAfter", String(options.includeAfter));
  }

  try {
    const container = await requestServer(`/playQueues/${encodeURIComponent(playQueueId)}?${params.toString()}`);
    return parsePlayQueue(container);
  } catch (error) {
    if (isRequestStatusError(error, 400) || isRequestStatusError(error, 404)) {
      try {
        const container = await requestPlayQueueViaPlayer(playQueueId, params);
        return parsePlayQueue(container);
      } catch {
        if (isRequestStatusError(error, 400)) {
          const fallbackContainer = await requestServer(`/playQueues/${encodeURIComponent(playQueueId)}?own=1`);
          return parsePlayQueue(fallbackContainer);
        }
      }
    }

    throw error;
  }
}

export async function getPlayQueueForTimeline(
  timeline: TimelineInfo,
  options?: {
    window?: number;
    includeBefore?: number;
    includeAfter?: number;
  },
): Promise<PlayQueueInfo> {
  if (!timeline.playQueueID) {
    throw new Error("The current Plexamp timeline does not include a play queue.");
  }

  const baseUrl = getTimelineServerBaseUrl(timeline);

  if (!baseUrl) {
    return getPlayQueue(timeline.playQueueID, options);
  }

  const { plexToken } = await getConfig();
  const params = new URLSearchParams({ own: "1" });

  if (options?.window !== undefined) {
    params.set("window", String(options.window));
  }

  if (options?.includeBefore !== undefined) {
    params.set("includeBefore", String(options.includeBefore));
  }

  if (options?.includeAfter !== undefined) {
    params.set("includeAfter", String(options.includeAfter));
  }

  try {
    const container = await requestServerWithConnection(
      baseUrl,
      `/playQueues/${encodeURIComponent(timeline.playQueueID)}?${params.toString()}`,
      plexToken,
    );
    return parsePlayQueue(container);
  } catch (error) {
    if (isRequestStatusError(error, 400) || isRequestStatusError(error, 404)) {
      const container = await requestPlayQueueViaPlayer(timeline.playQueueID, params);
      return parsePlayQueue(container);
    }

    throw error;
  }
}

async function createPlayQueue(item: PlayableItem): Promise<PlayQueueInfo> {
  const identity = await getServerIdentity();
  const params = new URLSearchParams({
    type: "audio",
    continuous: "1",
    repeat: "0",
    own: "1",
  });

  if (item.type === "playlist") {
    params.set("playlistID", item.ratingKey);
  } else {
    params.set("uri", buildPlayableUri(identity.machineIdentifier, item));
    params.set("key", item.key);
  }

  const container = await requestServer(`/playQueues?${params.toString()}`, {
    method: "POST",
  });
  return parsePlayQueue(container);
}

async function startPlayQueue(queue: PlayQueueInfo): Promise<void> {
  const config = await requireServerConfig();
  const identity = await getServerIdentity();
  const selectedKey = queue.selectedKey ?? queue.items[0]?.key;

  if (!selectedKey) {
    throw new Error("The created play queue did not include a playable track.");
  }

  await requestPlayer("/player/playback/playMedia", {
    machineIdentifier: identity.machineIdentifier,
    address: identity.address,
    port: identity.port,
    protocol: identity.protocol,
    token: config.plexServerToken ?? config.plexToken,
    key: selectedKey,
    containerKey: `/playQueues/${queue.id}?window=200&own=1`,
  });
}

async function seekTo(offset: number): Promise<void> {
  await requestPlayer("/player/playback/seekTo", {
    type: "music",
    offset: String(offset),
  });
}

async function addToPlayQueue(playQueueId: string, item: PlayableItem, next = false): Promise<void> {
  const identity = await getServerIdentity();
  const params = new URLSearchParams({ type: "audio" });

  if (next) {
    params.set("next", "1");
  }

  if (item.type === "playlist") {
    params.set("playlistID", item.ratingKey);
  } else {
    params.set("uri", buildPlayableUri(identity.machineIdentifier, item));
  }

  await requestServer(`/playQueues/${playQueueId}?${params.toString()}`, {
    method: "PUT",
  });
}

async function addToPlayQueueForTimeline(timeline: TimelineInfo, item: PlayableItem, next = false): Promise<void> {
  if (!timeline.playQueueID) {
    throw new Error("The current Plexamp timeline does not include a play queue.");
  }

  const baseUrl = getTimelineServerBaseUrl(timeline);

  if (!baseUrl) {
    await addToPlayQueue(timeline.playQueueID, item, next);
    return;
  }

  const { plexToken } = await getConfig();
  const machineIdentifier = timeline.machineIdentifier ?? (await getServerIdentity()).machineIdentifier;
  const params = new URLSearchParams({ type: "audio" });

  if (next) {
    params.set("next", "1");
  }

  if (item.type === "playlist") {
    params.set("playlistID", item.ratingKey);
  } else {
    params.set("uri", buildPlayableUri(machineIdentifier, item));
  }

  await requestServerWithConnection(baseUrl, `/playQueues/${timeline.playQueueID}?${params.toString()}`, plexToken, {
    method: "PUT",
  });
}

async function movePlayQueueItemInternal(
  playQueueId: string,
  playQueueItemId: string,
  afterPlayQueueItemId?: string,
  timeline?: TimelineInfo,
): Promise<void> {
  const params = new URLSearchParams();

  if (afterPlayQueueItemId) {
    params.set("after", afterPlayQueueItemId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  await requestTimelineServer(
    timeline ?? { state: "unknown" },
    `/playQueues/${playQueueId}/items/${playQueueItemId}/move${suffix}`,
    {
      method: "PUT",
    },
  );
}

async function createExplicitQueueFromTimeline(
  timeline: TimelineInfo,
  item: PlayableItem,
  next = false,
): Promise<void> {
  const currentItem =
    timeline.current?.type === "track"
      ? timeline.current
      : timeline.key
        ? await getMetadataByKeyForTimeline(timeline, timeline.key)
        : timeline.ratingKey
          ? await getMetadataByRatingKey(timeline.ratingKey)
          : undefined;

  if (!currentItem || currentItem.type !== "track") {
    throw new Error("Could not access the current Plexamp queue, and the current track metadata was unavailable.");
  }

  const queue = await createPlayQueue(currentItem);
  await addToPlayQueue(queue.id, item, next);
  await startPlayQueue(queue);

  if (timeline.time !== undefined && timeline.time > 0) {
    try {
      await seekTo(timeline.time);
    } catch {
      // Keep playback going even if Plexamp rejects the seek restore.
    }
  }
}

export async function playItem(item: PlayableItem): Promise<void> {
  const queue = await createPlayQueue(item);
  await startPlayQueue(queue);
}

export async function queueItem(item: PlayableItem): Promise<void> {
  const timeline = await getTimeline();

  if (timeline.playQueueID) {
    await addToPlayQueueForTimeline(timeline, item);
    await refreshPlayQueue(timeline.playQueueID);
    return;
  }

  await playItem(item);
}

export async function playNextItem(item: PlayableItem): Promise<void> {
  const timeline = await getTimeline();

  if (timeline.playQueueID) {
    try {
      await addToPlayQueueForTimeline(timeline, item, true);
      await refreshPlayQueue(timeline.playQueueID);
    } catch (error) {
      if (!isRequestStatusError(error, 404)) {
        throw error;
      }

      await createExplicitQueueFromTimeline(timeline, item, true);
    }
    return;
  }

  await playItem(item);
}

export async function refreshPlayQueue(playQueueId: string): Promise<void> {
  await requestPlayer("/player/playback/refreshPlayQueue", {
    type: "music",
    playQueueID: playQueueId,
  });
}

export async function removePlayQueueItem(
  playQueueId: string,
  playQueueItemId: string,
  timeline?: TimelineInfo,
): Promise<void> {
  await requestTimelineServer(timeline ?? { state: "unknown" }, `/playQueues/${playQueueId}/items/${playQueueItemId}`, {
    method: "DELETE",
  });
  await refreshPlayQueue(playQueueId);
}

export async function clearPlayQueue(
  playQueueId: string,
  preservePlayQueueItemId?: string,
  timeline?: TimelineInfo,
): Promise<void> {
  let selectedItemId = preservePlayQueueItemId;
  let iterations = 0;

  while (iterations < 100) {
    const queue = timeline?.playQueueID
      ? await getPlayQueueForTimeline(timeline, {
          window: 10000,
          includeBefore: 10000,
          includeAfter: 10000,
        })
      : await getPlayQueue(playQueueId, {
          window: 10000,
          includeBefore: 10000,
          includeAfter: 10000,
        });
    selectedItemId = selectedItemId ?? queue.selectedItemID;

    if (!selectedItemId) {
      throw new Error("Could not determine the current queue item to preserve.");
    }

    const removableItemIds = queue.items
      .map((item) => item.playQueueItemID)
      .filter((itemId): itemId is string => Boolean(itemId) && itemId !== selectedItemId);

    if (removableItemIds.length === 0) {
      await refreshPlayQueue(playQueueId);
      return;
    }

    for (const itemId of removableItemIds) {
      await requestTimelineServer(timeline ?? { state: "unknown" }, `/playQueues/${playQueueId}/items/${itemId}`, {
        method: "DELETE",
      });
    }

    await refreshPlayQueue(playQueueId);
    iterations += 1;
  }

  throw new Error("Could not clear the full queue after multiple passes.");
}

export async function movePlayQueueItem(
  playQueueId: string,
  playQueueItemId: string,
  afterPlayQueueItemId?: string,
  timeline?: TimelineInfo,
): Promise<void> {
  await movePlayQueueItemInternal(playQueueId, playQueueItemId, afterPlayQueueItemId, timeline);
  await refreshPlayQueue(playQueueId);
}

export async function playPause(): Promise<void> {
  await requestPlayer("/player/playback/playPause", { type: "music" });
}

export async function stop(): Promise<void> {
  await requestPlayer("/player/playback/stop", { type: "music" });
}

export async function skipNext(): Promise<void> {
  await requestPlayer("/player/playback/skipNext", { type: "music" });
}

export async function skipPrevious(): Promise<void> {
  await requestPlayer("/player/playback/skipPrevious", { type: "music" });
}

async function setPlaybackParameters(params: Record<string, string | undefined>): Promise<void> {
  await requestPlayer("/player/playback/setParameters", {
    type: "music",
    ...params,
  });
}

export async function setShuffle(enabled: boolean): Promise<void> {
  await setPlaybackParameters({ shuffle: enabled ? "1" : "0" });
}

export async function setRepeat(mode: "0" | "1" | "2"): Promise<void> {
  await setPlaybackParameters({ repeat: mode });
}

export async function skipToQueueItem(track: MusicTrack): Promise<void> {
  if (!track.playQueueItemID) {
    throw new Error("This track is missing a play queue item id.");
  }

  await requestPlayer("/player/playback/skipTo", {
    type: "music",
    key: track.key,
    playQueueItemID: track.playQueueItemID,
  });
}
