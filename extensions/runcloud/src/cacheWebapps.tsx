import { getPreferenceValues, Cache, updateCommandMetadata } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";

export interface Preferences {
  apiKey: string;
  apiSecret: string;
}

const cache = new Cache();

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const apiKey = preferences.apiKey;
  const apiSecret = preferences.apiSecret;

  // Create the basic authentication header value
  const credentials = `${apiKey}:${apiSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  const fetchServers = async (): Promise<Server[]> => {
    let allServers: Server[] = [];
    let page = 1;

    try {
      while (page <= 100) {
        const url = `https://manage.runcloud.io/api/v2/servers?page=${page}`;
        const options: RequestInit = {
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            accept: "application/json",
            "content-type": "application/json",
          },
        };
        const response = await fetch(url, options);
        const data = (await response.json()) as ServerResponse;
        const servers = parseServers(data);
        allServers = allServers.concat(servers);

        if (servers.length === 0) {
          break;
        }

        page++;
      }
    } catch (error) {
      console.error("Error fetching servers:", error);
    }

    return allServers;
  };

  const fetchWebappsForServer = async (serverId: number, server: Server): Promise<WebApp[]> => {
    let allWebapps: WebApp[] = [];
    let page = 1;

    try {
      while (page <= 100) {
        const url = `https://manage.runcloud.io/api/v2/servers/${serverId}/webapps?page=${page}`;
        const options: RequestInit = {
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            accept: "application/json",
            "content-type": "application/json",
          },
        };
        const response = await fetch(url, options);
        const data = (await response.json()) as WebAppResponse;
        const webapps = parseWebapps(data, server);
        allWebapps = allWebapps.concat(webapps);

        if (webapps.length < 15) {
          // If the number of webapps on this page is less than 15, it means there are no more pages, so break the loop
          break;
        }

        page++;
      }
    } catch (error) {
      console.error(`Error fetching webapps for server ID ${serverId}:`, error);
    }

    return allWebapps;
  };

  const servers = await fetchServers();
  const allWebapps: WebApp[] = [];

  for (const server of servers) {
    const webapps = await fetchWebappsForServer(server.id, server);
    allWebapps.push(...webapps);
  }

  // Store the fetched data in the cache
  const dataToCache = {
    data: allWebapps,
  };
  cache.set("webapps", JSON.stringify(dataToCache));

  // Update command metadata with the total count of webapps
  await updateCommandMetadata({ subtitle: `Total Webapps: ${allWebapps.length}` });
}

interface WebAppResponse {
  data: WebApp[];
}

interface WebApp {
  id: number;
  server_user_id: number;
  server: Server;
  name: string;
  rootPath: string;
  publicPath: string;
  phpVersion: string;
  stack: string;
  stackMode: string;
  type: string;
  defaultApp: boolean;
  alias: null | string;
  pullKey1: string;
  pullKey2: string;
  created_at: string;
}

interface ServerResponse {
  data: Server[];
}

interface Server {
  id: number;
  name: string;
  provider: string;
  ipAddress: string;
  country_iso_code: string;
  os: string;
  osVersion: string;
  connected: boolean;
  online: boolean;
  agentVersion: string;
  phpCLIVersion: string;
  softwareUpdate: boolean;
  securityUpdate: boolean;
  transferStatus: string;
  created_at: string;
}

function parseServers(data: ServerResponse): Server[] {
  return (
    data?.data?.map((server: Server) => ({
      id: server.id,
      name: server.name,
      provider: server.provider,
      ipAddress: server.ipAddress,
      country_iso_code: server.country_iso_code,
      os: server.os,
      osVersion: server.osVersion,
      connected: server.connected,
      online: server.online,
      agentVersion: server.agentVersion,
      phpCLIVersion: server.phpCLIVersion,
      softwareUpdate: server.softwareUpdate,
      securityUpdate: server.securityUpdate,
      transferStatus: server.transferStatus,
      created_at: server.created_at,
    })) || []
  );
}

function parseWebapps(data: WebAppResponse, serverData: Server): WebApp[] {
  return (
    data?.data?.map((webapp: WebApp) => ({
      id: webapp.id,
      server_user_id: webapp.server_user_id,
      server: serverData,
      name: webapp.name,
      rootPath: webapp.rootPath,
      publicPath: webapp.publicPath,
      phpVersion: webapp.phpVersion,
      stack: webapp.stack,
      stackMode: webapp.stackMode,
      type: webapp.type,
      defaultApp: webapp.defaultApp,
      alias: webapp.alias,
      pullKey1: webapp.pullKey1,
      pullKey2: webapp.pullKey2,
      created_at: webapp.created_at,
    })) || []
  );
}
