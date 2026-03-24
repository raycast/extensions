import { showHUD } from "@raycast/api";
import { getState, setState } from "./lib/storage";
import { releaseQueue } from "./lib/state";

export default async function Command() {
  const state = await getState();

  if (state.streams.length <= 1) {
    await showHUD("Nothing to rotate");
    return;
  }

  const newState = releaseQueue(state);
  await setState(newState);
  await showHUD(`→ ${newState.streams[0].title}`);
}
