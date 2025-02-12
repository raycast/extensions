import { getPreferenceValues } from "@raycast/api";
import Controller, { Client } from "unifi-client";

let controller: Controller | null = null;

export function getUnifiControllerUrlPreference() {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.controllerUrl;
}

export function getUnifiUsernamePreference() {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.username;
}

export function getUnifiPasswordPreference() {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.password;
}

export async function getAuthenticatedUnifiClient() {
  if (!controller) {
    const username = getUnifiUsernamePreference();
    const password = getUnifiPasswordPreference();
    const controllerURL = getUnifiControllerUrlPreference();
    const http = controllerURL.startsWith("http:/");
    const url = http ? controllerURL.replaceAll("http:/", "https:/") : controllerURL; // use https with strictSSL off when a http url was entered to make the unifi library happy
    const strictSSL = http ? false : true;
    controller = new Controller({
      username,
      password,
      url,
      strictSSL,
    });
    await controller.login();
  }
  return controller;
}

export function isClientConnected(client: Client) {
  return client.networkId;
  /*if (!client.lastSeen) {
    return false;
  }
  if (!client.lastDisconnect) {
    return true;
  }
  const lastSeen = new Date(client.lastSeen);
  const lastDisconnect = new Date(client.lastDisconnect);
  return lastDisconnect <= lastSeen;*/
}
