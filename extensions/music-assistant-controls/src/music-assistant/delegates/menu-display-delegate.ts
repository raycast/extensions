import { StoredQueue } from "../../player-selection/use-selected-player-id";
import { PlayerQueue, PlayerState, Player } from "../external-code/interfaces";

export function findActiveQueue(queues: PlayerQueue[], storedQueueId?: StoredQueue): PlayerQueue | undefined {
  if (queues.length === 0) return undefined;

  if (storedQueueId?.queue_id) {
    const storedQueue = queues.find((q) => q.queue_id === storedQueueId.queue_id);
    if (storedQueue) return storedQueue;
  }

  return queues[0];
}

export function getDisplayTitle(queue?: PlayerQueue): string | undefined {
  if (!queue || queue.state !== PlayerState.PLAYING) {
    return undefined;
  }

  return queue.current_item?.name;
}

export function getCurrentlyPlayingSong(player?: Player): string {
  if (!player?.current_media?.title) return "";
  const parts = [player.current_media.title];
  if (player.current_media.artist) {
    parts.push(player.current_media.artist);
  }
  return parts.join(" - ");
}

export function getQueueCurrentSong(queue?: PlayerQueue): string {
  return queue?.current_item?.name || "";
}

export function getPlayPauseButtonText(state: PlayerState): string {
  return state === PlayerState.PLAYING ? "Pause" : "Play";
}

export function isPlaying(state: PlayerState): boolean {
  return state === PlayerState.PLAYING;
}

export function createQueueSelection(queue: PlayerQueue): { title?: string; queueId: string } {
  return {
    title: getDisplayTitle(queue),
    queueId: queue.queue_id,
  };
}

export function isDisplayablePlayer(player: Player): boolean {
  const isGroupLeader = player.group_childs && player.group_childs.length > 0;
  const isStandalone = !player.synced_to;
  return isGroupLeader || isStandalone;
}

export function getDisplayableQueues(queues: PlayerQueue[], players: Player[]): PlayerQueue[] {
  return queues.filter((queue) => {
    const player = players.find((p) => p.player_id === queue.queue_id);
    return player && isDisplayablePlayer(player);
  });
}

export function getDisplayQueueForMenuBar(
  activeQueue: PlayerQueue | undefined,
  players: Player[],
  queues: PlayerQueue[],
): PlayerQueue | undefined {
  if (!activeQueue) return undefined;

  const player = players.find((p) => p.player_id === activeQueue.queue_id);
  if (!player) return activeQueue;

  if (isDisplayablePlayer(player)) {
    return activeQueue;
  }

  if (player.synced_to) {
    const leaderQueue = queues.find((q) => q.queue_id === player.synced_to);
    return leaderQueue || activeQueue;
  }

  return activeQueue;
}
