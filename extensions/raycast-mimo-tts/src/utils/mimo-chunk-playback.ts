import { Toast } from "@raycast/api";
import type { AudioPlayer } from "./audio-player";
import { markIdle, patchNowPlaying } from "./mimo-playback-state";
import type { playChunksWithLookahead } from "./mimo-pipelined-reading";

type ChunkPlaybackCallbacks = NonNullable<Parameters<typeof playChunksWithLookahead>[3]>;

export function createChunkPlaybackCallbacks({
  toast,
  voiceName,
  toastMessage,
  onFirstAudioReady,
}: {
  toast: Toast;
  voiceName: string;
  toastMessage: string;
  onFirstAudioReady?: () => void | Promise<void>;
}): ChunkPlaybackCallbacks {
  return {
    onChunkReady: async (index, total) => {
      const label = total > 1 ? `Playing ${index + 1}/${total} · ${voiceName}` : `Playing · ${voiceName}`;
      toast.title = label;
      toast.message = toastMessage;
      await patchNowPlaying({ status: "playing", currentChunk: index });
    },
    onFirstAudioReady: async () => {
      await onFirstAudioReady?.();
    },
  };
}

export async function finalizeChunkPlayback({
  player,
  toast,
  voiceName,
  totalChunks,
}: {
  player: AudioPlayer;
  toast: Toast;
  voiceName: string;
  totalChunks: number;
}): Promise<void> {
  if (player.isStopped()) {
    toast.style = Toast.Style.Success;
    toast.title = "Stopped";
    await markIdle();
    return;
  }

  toast.style = Toast.Style.Success;
  toast.title = "Playback complete";
  toast.message = `${voiceName} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
  await markIdle();
}
