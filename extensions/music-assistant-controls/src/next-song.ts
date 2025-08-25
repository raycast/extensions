import { getPreferenceValues } from "@raycast/api";
import { Prefs } from "./preferences";
import executeApiCommand from "./api-command";

export default async function main() {
  const { host, playerId } = getPreferenceValues<Prefs>();
  await executeApiCommand(host, async (api) => await api.playerCommandNext(playerId));
}
