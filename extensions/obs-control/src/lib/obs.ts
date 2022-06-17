import OBSWebSocket from "obs-websocket-js";

export function getObs () {
  const obs = new OBSWebSocket();

  return obs
}