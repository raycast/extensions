import { ActionPanel, Action, Detail, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { RequestInit } from "node-fetch";

export interface Preferences {
  apiKey: string;
  apiSecret: string;
}

export default function Command() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const preferences = getPreferenceValues<Preferences>();

  const apiKey = preferences.apiKey;
  const apiSecret = preferences.apiSecret;

  // Create the basic authentication header value
  const credentials = `${apiKey}:${apiSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  const fetchServers = async (page: number): Promise<Server[]> => {
    try {
      const url = `https://manage.runcloud.io/api/v2/servers?page=${page}&search=${encodeURIComponent(searchText)}`;
      const options: RequestInit = {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          accept: "application/json",
          "content-type": "application/json",
        },
      };
      const response = await fetch(url, options);
      const data = (await response.json()) as ServerResponse;

      if (data.message == "Invalid credentials.") {
        setErrorMessage(
          "Your API credentials are invalid. Please obtain valid keys from your RunCloud account settings. Once you have your API keys, configure the extension with them."
        );
        return [];
      }

      return parseFetchResponse(data);
    } catch (error) {
      console.error("Error fetching servers:", error);
      return [];
    }
  };

  const fetchAndSetServers = async (page: number): Promise<void> => {
    const servers = await fetchServers(page);

    if (servers.length > 0) {
      // If servers are found on this page, add them to the list and fetch the next page
      setServers((prevServers) => [...prevServers, ...servers]);
      await fetchAndSetServers(page + 1);
    } else {
      // If no servers are found on this page, stop fetching and populating the list
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setServers([]); // Clear the existing servers when a new search text is entered
    fetchAndSetServers(1);
  }, [searchText, apiKey, apiSecret]);

  return errorMessage ? (
    <Detail markdown={errorMessage} />
  ) : (
    <List isLoading={loading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search servers.." throttle>
      <List.Section title="Servers" subtitle={servers.length + ""}>
        {servers.map((server) => (
          <SearchListItem key={server.id} server={server} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ server }: { server: Server }) {
  console.log(server);
  return (
    <List.Item
      title={server.name}
      subtitle={server.ipAddress}
      accessories={[{ text: `PHP CLI: ${server.phpCLIVersion}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://manage.runcloud.io/servers/${server.id}/summary?scroll=0`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface ServerResponse {
  data: Server[];
  message: string;
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

function parseFetchResponse(data: ServerResponse): Server[] {
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
