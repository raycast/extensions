import { getPreferenceValues } from "@raycast/api";
import { Prefs } from "./preferences";
import executeApiCommand from "./api-command";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const { host, playerId } = getPreferenceValues<Prefs>();
  try {
    await executeApiCommand(host, async (api) => await api.playerCommandPlayPause(playerId));
  } catch (error) {
    showFailureToast(error, {
      title: "Couldn't reach Music Assistant",
    });
  }
}
