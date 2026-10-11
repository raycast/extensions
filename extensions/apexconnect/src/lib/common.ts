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
  // The library calls this factory for the initial connect AND for every
  // internal reconnect attempt, passing the same Connection through each
  // time (preserving existing subscriptions). Resolving nearestURL() fresh
  // on every call - instead of baking in one Auth up front - is what lets a
  // reconnect follow a network change instead of retrying a host that's no
  // longer reachable.
  con = await createConnection({
    createSocket: async () => {
      const instance = await apex.nearestURL();
      const auth = createLongLivedTokenAuth(instance, apex.token);
      return createSocket(auth, apex.ignoreCerts);
    },
  });
  return con;
}

export function shouldDisplayEntityID(): boolean {
  const preferences = getPreferenceValues();
  return (preferences.showEntityId as boolean) || false;
}
