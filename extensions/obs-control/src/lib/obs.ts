import OBSWebSocket from "obs-websocket-js";
import type { OBSRequestTypes } from "obs-websocket-js";
import { getPreferenceValues } from "@raycast/api";
import { showWebsocketConnectionErrorToast } from "@/lib/utils";

const values = getPreferenceValues<Preferences>();

export async function getObs() {
  const obs = new OBSWebSocket();

  await obs.connect(values["obs-url"], values["obs-password"]);

  return obs;
}

export async function callObs<Type extends keyof OBSRequestTypes>(
  requestType: Type,
  requestData?: OBSRequestTypes[Type],
) {
  let obs: OBSWebSocket;
  try {
    obs = await getObs();
  } catch {
    return showWebsocketConnectionErrorToast();
  }

  return await obs.call(requestType, requestData);
}
