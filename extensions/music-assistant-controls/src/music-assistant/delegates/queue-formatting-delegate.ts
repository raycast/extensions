import { Player, RepeatMode } from "../external-code/interfaces";

export function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatAddToQueueNextMessage(itemName: string): string {
  return `"${itemName}" will play next`;
}

export function getQueueMovePositionShift(direction: "up" | "down" | "next"): number {
  if (direction === "up") return -1;
  if (direction === "down") return 1;
  return 0;
}

export function getQueueMoveFeedback(direction: "up" | "down" | "next"): string {
  return `Moved ${direction === "next" ? "to next" : direction}`;
}

export function getShuffleText(shuffleEnabled: boolean): string {
  return shuffleEnabled ? "Shuffle: ON" : "Shuffle: OFF";
}

export function getRepeatText(repeatMode: RepeatMode): string {
  const modeMap = {
    [RepeatMode.OFF]: "OFF",
    [RepeatMode.ONE]: "ONE",
    [RepeatMode.ALL]: "ALL",
  };
  return `Repeat: ${modeMap[repeatMode]}`;
}

export function getNextRepeatMode(repeatMode: RepeatMode): RepeatMode {
  if (repeatMode === RepeatMode.OFF) {
    return RepeatMode.ALL;
  }
  if (repeatMode === RepeatMode.ALL) {
    return RepeatMode.ONE;
  }
  return RepeatMode.OFF;
}

export function getNextRepeatModeLabel(currentMode: RepeatMode): "OFF" | "ONE" | "ALL" {
  return currentMode === RepeatMode.OFF ? "ONE" : currentMode === RepeatMode.ONE ? "ALL" : "OFF";
}

export function formatCurrentMediaTitle(
  currentMedia: Player["current_media"] | undefined,
  fallbackTitle: string,
): string {
  const title = currentMedia?.title || fallbackTitle;
  const artist = currentMedia?.artist || "";
  return artist ? `${title} - ${artist}` : title;
}

export function formatVolumeTransition(previous: number, next: number): string {
  return `Volume ${previous}% -> ${next}%`;
}
