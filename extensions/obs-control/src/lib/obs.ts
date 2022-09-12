import OBSWebSocket from "obs-websocket-js";
import { getPreferenceValues } from "@raycast/api";
import { Preference } from "../preferences";

const values = getPreferenceValues<Preference>();

export async function getObs() {
  const obs = new OBSWebSocket();

  await obs.connect(values["obs-url"], values["obs-password"]);

  return obs;
}
