import OBSWebSocket from "obs-websocket-js";
import type { OBSRequestTypes } from "obs-websocket-js";
import { getPreferenceValues } from "@raycast/api";
import { openObsStudio, showWebsocketConnectionErrorToast } from "@/lib/utils";

const values = getPreferenceValues<Preferences>();
const startupRetryCount = 15;
const startupRetryDelay = 1000;

function isLocalUnavailable(error: unknown) {
  let url: URL;
  try {
    url = new URL(values["obs-url"]);
  } catch {
    return false;
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (!localHost || !["ws:", "wss:"].includes(url.protocol) || !(error instanceof Error)) {
    return false;
  }

  const connectionError = error as Error & { code?: number };
  return connectionError.code === 1006 || (connectionError.code === -1 && /ECONNREFUSED/i.test(error.message));
}

async function connectObs() {
  const obs = new OBSWebSocket();
  await obs.connect(values["obs-url"], values["obs-password"]);
  return obs;
}

export async function getObs() {
  try {
    return await connectObs();
  } catch (error) {
    if (!isLocalUnavailable(error)) {
      throw error;
    }
    await openObsStudio();
  }

  for (let attempt = 0; attempt < startupRetryCount; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, startupRetryDelay));

    try {
      return await connectObs();
    } catch (error) {
      if (!isLocalUnavailable(error)) {
        throw error;
      }
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
