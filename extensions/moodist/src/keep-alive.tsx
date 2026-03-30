import { reconcile } from "./lib/playback-controller";
import { getPlaybackState } from "./lib/playback-state";

export default async function KeepAliveCommand() {
  const state = await getPlaybackState();
  if (!state.isPlaying || state.activeSounds.length === 0) return;
  await reconcile();
}
