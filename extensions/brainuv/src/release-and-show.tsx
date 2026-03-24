import { launchCommand, LaunchType } from "@raycast/api";
import { getState, setState } from "./lib/storage";
import { releaseQueue } from "./lib/state";

export default async function Command() {
  const state = await getState();

  if (state.streams.length <= 1) {
    await launchCommand({
      name: "stream-loop",
      type: LaunchType.UserInitiated,
    });
    return;
  }

  const newState = releaseQueue(state);
  await setState(newState);

  await launchCommand({ name: "stream-loop", type: LaunchType.UserInitiated });
}
