import { preferences } from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { HomeAssistant } from "./haapi";
import { createSocket } from "./socket";

function getInstance(): string {
  let result = preferences.instance?.value as string;
  if (result && result.endsWith("/")) {
    // make sure to have no trailing slash
    result = result.substring(0, result.length - 1);
  }
  return result;
}

export function createHomeAssistantClient(): HomeAssistant {
  const instance = preferences.instance?.value as string;
  const token = preferences.token?.value as string;
  const hac = new HomeAssistant(instance, token);
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
    const token = preferences.token?.value as string;
    const ignoreCertificates = (preferences.ignorecerts.value as boolean) || false;
    const auth = createLongLivedTokenAuth(instance, token);
    con = await createConnection({ auth, createSocket: async () => createSocket(auth, ignoreCertificates) });
    return con;
  }
}

export function shouldDisplayEntityID(): boolean {
  const result = (preferences.instance?.value as boolean) || false;
  return result;
}

export const ha = createHomeAssistantClient();
