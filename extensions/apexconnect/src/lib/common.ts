import { getPreferenceValues } from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "@apexinfosysindia/js-websocket";
import { ApexConnectClient } from "./apexapi";
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

let con: Connection | undefined;
export const apex = createApexConnectClient();

export async function getApexWSConnection(): Promise<Connection> {
  if (con) {
    return con;
  }
  const instance = await apex.nearestURL();
  const auth = createLongLivedTokenAuth(instance, apex.token);
  const connection = await createConnection({ auth, createSocket: async () => createSocket(auth, apex.ignoreCerts) });
  // The library's own reconnect logic keeps retrying the same host; if that
  // keeps failing, the network likely changed (e.g. left home WiFi). Drop
  // the cached connection so the next call re-resolves nearestURL() instead
  // of being stuck on a host that's no longer reachable.
  connection.addEventListener("reconnect-error", () => {
    if (con === connection) {
      con = undefined;
      connection.close();
    }
  });
  con = connection;
  return con;
}

export function shouldDisplayEntityID(): boolean {
  const preferences = getPreferenceValues();
  return (preferences.showEntityId as boolean) || false;
}
