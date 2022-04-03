import { ActionPanel, List, Icon, Action, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Server } from "./api/Server";
import { Site } from "./api/Site";
import { SitesList, ISite } from "./Site";
import { getServerColor, useIsMounted } from "./helpers";

export const ServersList = () => {
  const [servers, setServers] = useState<IServer[]>([]);
  const [siteData, setSiteData] = useState<LocalStorage.Values>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const isMounted = useIsMounted();

  /**
   * This will attempt to fetch and cache sites as the user
   * navigates. However, the cache isn't useful until they
   * reload the extension.
   * Possible Raycast rendering bug discussed here:
   * https://raycastcommunity.slack.com/archives/C01A0R0NXGQ/p1640566594305400?thread_ts=1640282139.293800&cid=C01A0R0NXGQ
   */
  const maybeFetchAndCacheSites = async (serverId: string) => {
    const key = `forge-sites-${serverId.toString()}`;
    // If the sites already exist in the cache, or not found, do nothign
    if (siteData[key] || !isMounted.current) return;
    const server = servers.find((s) => s?.id?.toString() === serverId) as IServer;
    if (!server) return;
    const thisSiteData = (await Site.getAll(server)) as ISite[] | undefined;
    thisSiteData && (await LocalStorage.setItem(`forge-sites-${serverId}`, JSON.stringify(thisSiteData)));
  };

  useEffect(() => {
    LocalStorage.allItems()
      .then((data) => {
        if (!isMounted.current) return;
        const servers = data["forge-servers"];
        delete data["forge-servers"];
        const serverList = JSON.parse(servers?.toString() ?? "[]") as IServer[];
        setServers(serverList?.length ? serverList : []);
        setSiteData(data ?? {});
      })
      .finally(() => {
        if (!isMounted.current) return;
        Server.getAll()
          .then(async (servers: Array<IServer> | undefined) => {
            if (!isMounted.current) return;
            setLoading(false);
            if (!servers?.length) return;
            setServers(servers);
            // Add the server list to storage to avoid content flash
            await LocalStorage.setItem("forge-servers", JSON.stringify(servers));
          })
          .catch((error) => setErrorMessage(error.message));
      });
  }, []);

  if (errorMessage.length) {
    return <EmptyView title={errorMessage} />;
  }
  if (loading) {
    return <EmptyView title="Fetching servers..." />;
  }
  if (!servers.length) {
    return <EmptyView title="No servers found" />;
  }

  return (
    <List
      isLoading={!servers?.length && !loading}
      searchBarPlaceholder="Search servers..."
      onSelectionChange={(serverId) => serverId && maybeFetchAndCacheSites(serverId)}
    >
      {servers.map((server: IServer) => {
        const key = `forge-sites-${server?.id?.toString()}`;
        const sites = JSON.parse(siteData[key] ?? "[]") as ISite[];
        return <ServerListItem key={server.id} server={server} sites={sites} />;
      })}
    </List>
  );
};

const EmptyView = ({ title }: { title: string }) => (
  <List>
    <List.EmptyView icon={{ source: "forge-icon-64.png" }} title={title} />
  </List>
);

const ServerListItem = ({ server, sites }: { server: IServer; sites: ISite[] }) => {
  if (!server?.id) return null;
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      keywords={server.keywords}
      accessoryTitle={server?.keywords?.join(", ")}
      title={server?.name ?? "Server name undefined"}
      icon={{
        source: "server.png",
        tintColor: getServerColor(server?.provider ?? ""),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Information"
              icon={Icon.Binoculars}
              target={<SingleServerView server={server} sites={sites} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const SingleServerView = ({ server, sites }: { server: IServer; sites: ISite[] }) => {
  const preferences = getPreferenceValues();
  const sshUser = preferences?.laravel_forge_ssh_user ?? "forge";
  return (
    <List searchBarPlaceholder="Search sites...">
      <List.Section title={`${server.name?.toUpperCase()} -> Sites`}>
        <SitesList server={server} sites={sites} />
      </List.Section>
      <List.Section title="Common Commands">
        <List.Item
          id="open-on-forge"
          key="open-on-forge"
          title="Open on Laravel Forge"
          icon={Icon.Globe}
          accessoryTitle="forge.laravel.com"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://forge.laravel.com/servers/${server.id}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH connection (${sshUser})`}
          icon={Icon.Terminal}
          accessoryTitle={`ssh://${sshUser}@${server.ipAddress}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`Open SSH Connection (${sshUser})`}
                url={`ssh://${sshUser}@${server.ipAddress}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-ip"
          key="copy-ip"
          title="Copy IP address"
          icon={Icon.Clipboard}
          accessoryTitle={server.ipAddress}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy IP Address" content={server?.ipAddress ?? ""} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Reboot">
        <List.Item
          id="reboot-server"
          key="reboot-server"
          title="Reboot server"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reboot Server"
                onAction={async () => await Server.reboot({ serverId: server.id, token: server.apiToken })}
              />
            </ActionPanel>
          }
        />
        {Object.entries({ mysql: "MySQL", nginx: "Nginx", postgres: "Postgres", php: "PHP" }).map(([key, label]) => {
          return (
            <List.Item
              id={key}
              key={key}
              title={`Reboot ${label}`}
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.ArrowClockwise}
                    title={`Reboot ${label}`}
                    onAction={async () =>
                      await Server.reboot({ serverId: server.id, token: server.apiToken, key, label })
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {/* TODO: maybe a markdown view with server stats? */}
    </List>
  );
};

export const ServerCommands = ({ server }: { server: IServer }) => {
  const preferences = getPreferenceValues();
  const sshUser = preferences?.laravel_forge_ssh_user ?? "forge";
  return (
    <>
      <Action.OpenInBrowser title="Open on Laravel Forge" url={`https://forge.laravel.com/servers/${server.id}`} />
      <Action.OpenInBrowser
        icon={Icon.Terminal}
        title={`Open SSH Connection (${sshUser})`}
        url={`ssh://${sshUser}@${server.ipAddress}`}
      />
      <Action
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => Server.reboot({ serverId: server.id, token: server.apiToken })}
      />
      <Action.CopyToClipboard title="Copy IP Address" content={server?.ipAddress ?? ""} />
    </>
  );
};

export interface IServer {
  apiToken?: string;
  id?: number;
  credentialId?: string | null;
  name?: string;
  type?: string;
  provider?: string;
  providerId?: string | null;
  size?: string;
  region?: string;
  dbStatus?: string | null;
  redisStatus?: string | null;
  phpVersion?: string;
  phpCliVersion?: string;
  databaseType?: string;
  ipAddress?: string;
  sshPort?: number;
  privateIpAddress?: string;
  blackfireStatus?: string | null;
  papertrailStatus?: string | null;
  revoked?: boolean;
  createdAt?: string;
  isReady?: boolean;
  tags?: string[];
  keywords?: string[];
  network?: string[];
}
