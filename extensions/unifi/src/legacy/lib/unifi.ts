import { getPreferenceValues } from "@raycast/api";
import Controller, { Client } from "unifi-client";

let controller: Controller | null = null;

export function getUnifiControllerUrlPreference() {
  const prefs = getPreferenceValues();
  return prefs.controllerUrl;
}

export function getUnifiUsernamePreference() {
  const prefs = getPreferenceValues();
  return prefs.username;
}

export function getUnifiPasswordPreference() {
  const prefs = getPreferenceValues();
  return prefs.password;
}

export async function getAuthenticatedUnifiClient() {
  if (!controller?.auth) {
    const username = getUnifiUsernamePreference();
    const password = getUnifiPasswordPreference();
    const controllerURL = getUnifiControllerUrlPreference();
    const url = controllerURL; // use https with strictSSL off when a http url was entered to make the unifi library happy
    const strictSSL = false;
    if (!username || !password || !controllerURL) {
      throw new Error("Please provide a controller URL, username and password in the preferences.");
    }

    controller = new Controller({
      username,
      password,
      url,
      strictSSL,
    });

    try {
      await controller.login();
    } catch (error) {
      console.error("Failed to login to controller", error);
    }

    return controller;
  }

  return null;
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
