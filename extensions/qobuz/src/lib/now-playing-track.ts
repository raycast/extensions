import type { QobuzClient, Track } from "@kud/qobuz";

// The Qobuz app rewrites its player-state file on every queue change, so a
// read can land mid-write and parse as "nothing playing". One retry covers it.
const RETRY_DELAY_MS = 150;

export const nowPlaying = async (client: QobuzClient): Promise<Track | undefined> => {
  const first = await client.nowPlaying();
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return client.nowPlaying();
};
