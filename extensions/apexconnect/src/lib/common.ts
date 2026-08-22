import { environment, getPreferenceValues } from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "@apexinfosysindia/js-websocket";
import { ApexConnectClient } from "./haapi";
import { createSocket } from "./socket";

function ensureNoTrailingSlash(url: string | undefined): string | undefined {
  if (url && url.endsWith("/")) {
    const result = url.substring(0, url.length - 1);
    return result;
  }
  return url;
}

function createApexConnectClient(): ApexConnectClient {
  const preferences = getPreferenceValues();
  const instance = ensureNoTrailingSlash((preferences.instance as string) || undefined) || "";
  const instanceInternal = ensureNoTrailingSlash((preferences.instanceInternal as string) || undefined) || "";
  const token = preferences.token as string;
  const ignoreCerts = (preferences.ignorecerts as boolean) || false;
  const wifiSSIDs = ((preferences.homeSSIDs as string) || "").split(",").map((v) => v.trim());
  const usePing = preferences.usePing as boolean;
  const preferredApp = preferences.preferredapp as string | undefined;
  const apexClient = new ApexConnectClient(instance, token, ignoreCerts, {
    urlInternal: instanceInternal,
    wifiSSIDs: wifiSSIDs,
    usePing: usePing,
    preferCompanionApp: preferredApp === "companion",
  });
  return apexClient;
}

let con: Connection;
export const apex = createApexConnectClient();

export async function getApexWSConnection(): Promise<Connection> {
  if (con) {
    console.log("return existing ws con");
    return con;
  } else {
    console.log(`Create new Apex Connect ws con from command '${environment.commandName}'`);
    const instance = await apex.nearestURL();
    console.log(`Nearest Instance URL ${instance}`);
    const auth = createLongLivedTokenAuth(instance, apex.token);
    con = await createConnection({ auth, createSocket: async () => createSocket(auth, apex.ignoreCerts) });
    return con;
  }
}

export function shouldDisplayEntityID(): boolean {
  const preferences = getPreferenceValues();
  const result = (preferences.instance as boolean) || false;
  return result;
}
