export function activeMusicTrackStatus(backgroundMusicEnabled: boolean): "Playing" | "Selected" {
  return backgroundMusicEnabled ? "Playing" : "Selected";
}
