import { getPreferenceValues } from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { HomeAssistant } from "./haapi";
import { createSocket } from "./socket";

function getInstance(): string {
  const preferences = getPreferenceValues();
  let result = preferences.instance as string;
  if (result && result.endsWith("/")) {
    // make sure to have no trailing slash
    result = result.substring(0, result.length - 1);
  }
  return result;
}

export function createHomeAssistantClient(): HomeAssistant {
  const instance = getInstance();
  const preferences = getPreferenceValues();
  const token = preferences.token as string;
  const ignoreCerts = preferences.ignorecerts as boolean;
  const hac = new HomeAssistant(instance, token, ignoreCerts);
  return hac;
}

let con: Connection;

export async function getHAWSConnection(): Promise<Connection> {
  if (con) {
    console.log("return existing ws con");
    return con;
  } else {
    console.log("create new home assistant ws con");
    const instance = getInstance();
    const preferences = getPreferenceValues();
    const token = preferences.token as string;
    const ignoreCertificates = (preferences.ignorecerts as boolean) || false;
    const auth = createLongLivedTokenAuth(instance, token);
    con = await createConnection({ auth, createSocket: async () => createSocket(auth, ignoreCertificates) });
    return con;
  }
}

export function shouldDisplayEntityID(): boolean {
  const preferences = getPreferenceValues();
  const result = (preferences.instance as boolean) || false;
  return result;
}

export const ha = createHomeAssistantClient();
