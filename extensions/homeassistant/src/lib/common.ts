import { environment, getPreferenceValues } from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { HomeAssistant } from "./haapi";
import { createSocket } from "./socket";

function ensureNoTrailingSlash(url: string | undefined): string | undefined {
  if (url && url.endsWith("/")) {
    const result = url.substring(0, url.length - 1);
    return result;
  }
  return url;
}

function createHomeAssistantClient(): HomeAssistant {
  const preferences = getPreferenceValues();
  const instance = ensureNoTrailingSlash((preferences.instance as string) || undefined) || "";
  const instanceInternal = ensureNoTrailingSlash((preferences.instanceInternal as string) || undefined) || "";
  const token = preferences.token as string;
  const ignoreCerts = (preferences.ignorecerts as boolean) || false;
  const wifiSSIDs = ((preferences.homeSSIDs as string) || "").split(",").map((v) => v.trim());
  const usePing = preferences.usePing as boolean;
  const preferredApp = preferences.preferredapp as string | undefined;
  const hac = new HomeAssistant(instance, token, ignoreCerts, {
    urlInternal: instanceInternal,
    wifiSSIDs: wifiSSIDs,
    usePing: usePing,
    preferCompanionApp: preferredApp === "companion",
  });
  return hac;
}

let con: Connection;
export const ha = createHomeAssistantClient();

export async function getHAWSConnection(): Promise<Connection> {
  if (con) {
    console.log("return existing ws con");
    return con;
  } else {
    console.log(`Create new home assistant ws con from command '${environment.commandName}'`);
    const instance = await ha.nearestURL();
    console.log(`Nearest Instance URL ${instance}`);
    const auth = createLongLivedTokenAuth(instance, ha.token);
    con = await createConnection({ auth, createSocket: async () => createSocket(auth, ha.ignoreCerts) });
    return con;
  }
}

export function shouldDisplayEntityID(): boolean {
  const preferences = getPreferenceValues();
  const result = (preferences.instance as boolean) || false;
  return result;
}
