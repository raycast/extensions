import { ElsewhereCommand } from "./control-url";
import { ElsewhereSnapshotV1 } from "./state-reader";

type VolumeSnapshot = Pick<ElsewhereSnapshotV1, "ambienceVolume" | "musicVolume">;

export function successToastTitle(command: ElsewhereCommand, snapshot: VolumeSnapshot, fallbackTitle: string): string {
  if (command.kind !== "volume") return fallbackTitle;

  const label = command.target === "ambience" ? "Ambience" : "Background Music";
  const volume = command.target === "ambience" ? snapshot.ambienceVolume : snapshot.musicVolume;
  return `${label} Volume: ${volume}%`;
}
