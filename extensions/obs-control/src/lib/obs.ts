import OBSWebSocket from "obs-websocket-js";
import type { OBSRequestTypes } from "obs-websocket-js";
import { getPreferenceValues } from "@raycast/api";
import { openObsStudio, showWebsocketConnectionErrorToast } from "@/lib/utils";

const values = getPreferenceValues<Preferences>();
const startupRetryCount = 15;
const startupRetryDelay = 1000;

async function connectObs() {
  const obs = new OBSWebSocket();
  await obs.connect(values["obs-url"], values["obs-password"]);
  return obs;
}

export async function getObs() {
  try {
    return await connectObs();
  } catch {
    await openObsStudio();
  }

  for (let attempt = 0; attempt < startupRetryCount; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, startupRetryDelay));

    try {
      return await connectObs();
    } catch {
      // OBS may still be starting. Try again until the startup window expires.
    }
  }

  return await connectObs();
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
