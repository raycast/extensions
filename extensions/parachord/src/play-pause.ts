import { openParachord } from "./utils";
import { LocalStorage } from "@raycast/api";

const PLAYING_STATE_KEY = "parachord-playing-state";

export default async function Command() {
  const isPlaying = await LocalStorage.getItem<boolean>(PLAYING_STATE_KEY);
  const newState = !isPlaying;

  await LocalStorage.setItem(PLAYING_STATE_KEY, newState);
  if (newState) {
    await openParachord("control", ["resume"], {}, "Resumed playback");
  } else {
    await openParachord("control", ["pause"], {}, "Paused playback");
  }
}
