import { openParachord } from "./utils";
import { LocalStorage } from "@raycast/api";

const SHUFFLE_STATE_KEY = "parachord-shuffle-state";

export default async function Command() {
  // Toggle shuffle state (we track it locally since we can't query the app)
  const currentState = await LocalStorage.getItem<boolean>(SHUFFLE_STATE_KEY);
  const newState = !currentState;

  await LocalStorage.setItem(SHUFFLE_STATE_KEY, newState);
  await openParachord("shuffle", [newState ? "on" : "off"], {}, `Shuffle ${newState ? "on" : "off"}`);
}
