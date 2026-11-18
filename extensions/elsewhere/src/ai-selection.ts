import { ElsewhereCommand } from "./control-url";
import { executeElsewhereCommandForAi } from "./command-runner";
import { AiSelectionKind, resolveNamedItem } from "./name-resolution";
import { ElsewhereSnapshotV1, readElsewhereState } from "./state-reader";

function unavailableStateMessage(kind: AiSelectionKind): string {
  return `Could not read the available ${kind}s. Open Elsewhere v13.0.0 or later and try again.`;
}

async function readySnapshot(kind: AiSelectionKind): Promise<ElsewhereSnapshotV1> {
  const state = await readElsewhereState();
  if (state.kind === "unsupported") {
    throw new Error(
      "The Elsewhere state format is newer than this extension. Update the Raycast extension and try again.",
    );
  }
  if (state.kind !== "ready" || !state.snapshot.ready) throw new Error(unavailableStateMessage(kind));
  return state.snapshot;
}

export async function selectSpaceByName(name: string): Promise<string> {
  const snapshot = await readySnapshot("space");
  const space = resolveNamedItem(name, snapshot.spaces, "space");
  if (space.id === snapshot.activeSpaceId) return `${space.name} is already the active spatial soundscape.`;

  const command: ElsewhereCommand = { kind: "space", action: "select", id: space.id };
  await executeElsewhereCommandForAi(command);
  return `Switched to ${space.name}.`;
}

export async function selectBackgroundMusicByName(name: string): Promise<string> {
  const snapshot = await readySnapshot("background music track");
  const track = resolveNamedItem(name, snapshot.musicTracks, "background music track");
  if (track.id === snapshot.activeMusicTrackId && snapshot.backgroundMusicEnabled) {
    return `${track.name} is already the active background music.`;
  }

  const command: ElsewhereCommand = { kind: "music", action: "select", id: track.id };
  await executeElsewhereCommandForAi(command);
  return `Switched background music to ${track.name}.`;
}
