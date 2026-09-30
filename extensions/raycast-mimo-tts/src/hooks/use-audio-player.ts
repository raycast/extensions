import { useCallback, useEffect, useRef } from "react";
import { AudioPlayer } from "../utils/audio-player";
import { clearPlaybackStopRequest } from "../utils/mimo-playback-state";

export function useAudioPlayer() {
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    // preparePlayback swaps playerRef.current to a fresh AudioPlayer on every run,
    // so cleanup must read the ref at unmount time — not capture the initial player.
    return () => {
      playerRef.current.cleanup();
    };
  }, []);

  const preparePlayback = useCallback(async () => {
    playerRef.current.stopPlayback();
    await clearPlaybackStopRequest();
    const player = new AudioPlayer();
    playerRef.current = player;
    return player;
  }, []);

  const stopPlayback = useCallback(() => {
    playerRef.current.stopPlayback();
  }, []);

  return { playerRef, preparePlayback, stopPlayback };
}
