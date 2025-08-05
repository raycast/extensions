import { ActionPanel, LocalStorage, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { Server } from "./api/Server";
import { Site } from "./api/Site";
import { ISite, SitesList } from "./Site";
import { useIsMounted } from "./helpers";
import { PLOI_PANEL_URL } from "./config";
import { usePromise } from "@raycast/utils";

export const ServersList = () => {
  const [servers, setServers] = useState<IServer[]>([]);
  const [siteData, setSiteData] = useState<LocalStorage.Values>({});
  const isMounted = useIsMounted();

  const fetchAndCacheSites = async (serverId: string) => {
    const key = `ploi-sites-${serverId.toString()}`;
    // If the sites already exist in the cache, or not found, do nothing
    if (siteData[key] || !isMounted.current) return;
    const server = servers.find((s) => s.id.toString() === serverId) as IServer;
    if (!server) return;
    if (!Object.keys(server).length) return;
    const thisSiteData = (await Site.getAll(server)) as ISite[] | undefined;
    thisSiteData && (await LocalStorage.setItem(`ploi-sites-${serverId}`, JSON.stringify(thisSiteData)));
  };

  const [isLoadingLocal, setIsLoading] = useState(true);
  const [execute, setExecute] = useState(false);

  useEffect(() => {
    LocalStorage.allItems()
      .then((data) => {
        setIsLoading(false);
        if (!isMounted.current) return;
        const servers = data["ploi-servers"];
        delete data["ploi-servers"];
        const serverList = JSON.parse(servers?.toString() ?? "[]") as Array<IServer>;
        setServers(serverList?.length ? serverList : []);
        setSiteData(data ?? {});
      })
      .finally(() => {
        setIsLoading(false);
        if (!isMounted.current) return;
        setExecute(true);
      });
  }, []);

  const { isLoading: isLoadingPromise, pagination } = usePromise(
    () => async (options: { page: number }) => {
      const result = await Server.getAll(options.page + 1);
      return {
        data: result.data,
        hasMore: Boolean(result.links?.next),
      };
    },
    [],
    {
      execute,
      async onData(servers) {
        if (!isMounted.current) return;
        // Add the server list to storage to avoid content flash
        servers && setServers(servers);
        await LocalStorage.setItem("ploi-servers", JSON.stringify(servers));
      },
    },
  );

  const isLoading = isLoadingLocal || isLoadingPromise;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Servers..."
      onSelectionChange={(serverId) => serverId && fetchAndCacheSites(serverId)}
      pagination={pagination}
    >
      {!servers?.length && !isLoading && (
        <List.EmptyView
          title="There are no results to display."
          description="If you create your first server in ploi.io, it will show up here."
        />
      )}
      {servers.map((server: IServer) => {
        const key = `ploi-sites-${server.id.toString()}`;
        const sites = JSON.parse(siteData[key] ?? "[]") as ISite[];
        return <ServerListItem key={server.id} server={server} sites={sites} />;
      })}
    </List>
  );
};

const ServerListItem = ({ server, sites }: { server: IServer; sites: ISite[] }) => {
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      title={server.name}
      subtitle={server.status}
      icon={{
        source: {
          light: "server.png",
          dark: "server-dark.png",
        },
      }}
      accessories={[
        { tag: server.type },
        { text: `PHP ${server.phpVersion}` },
        { text: `MySQL ${server.mysqlVersion}` },
        { text: server.ipAddress },
        { date: new Date(server.createdAt) },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Info"
              icon={{
                source: {
                  light: "server.png",
                  dark: "server-dark.png",
                },
              }}
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
  interface Preferences {
    ploi_api_key: string;
    ploi_ssh_user: string;
  }

  const preferences = getPreferenceValues<Preferences>();

  const sshUser = preferences.ploi_ssh_user ?? "ploi";
  return (
    <List searchBarPlaceholder="Search Sites...">
      <List.Section title={`Sites on server ${server.name} · ${sites.length} site(s)`}>
        <SitesList server={server} sites={sites} />
      </List.Section>
      <List.Section title="Server Information">
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH Connection (${sshUser})`}
          icon={Icon.Terminal}
          accessories={[{ text: `ssh://${sshUser}@${server.ipAddress}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={`SSH In As User ${sshUser}`} url={`ssh://${sshUser}@${server.ipAddress}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-sftp"
          key="open-in-sftp"
          title={`Open SFTP Connection (${sshUser})`}
          icon={Icon.Terminal}
          accessories={[{ text: `sftp://${sshUser}@${server.ipAddress}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={`SFTP As User ${sshUser}`} url={`sftp://${sshUser}@${server.ipAddress}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-ploi"
          key="open-in-ploi"
          title="Open in ploi.io"
          icon={Icon.Globe}
          accessories={[{ text: "ploi.io" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${PLOI_PANEL_URL}/servers/${server.id}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-ip"
          key="copy-ip"
          title="Copy IP Address"
          icon={Icon.Clipboard}
          accessories={[{ text: server.ipAddress }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy IP Address" content={server.ipAddress} />
            </ActionPanel>
          }
        />
        <List.Item
          id="server-id"
          key="server-id"
          title="Server ID"
          icon={Icon.Document}
          accessories={[{ text: server.id.toString() }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={server.id ?? ""} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Services">
        <List.Item
          id="reboot-server"
          key="reboot-server"
          title="Reboot Server"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                icon={Icon.ArrowClockwise}
                title="Reboot Server"
                onAction={async () =>
                  await Server.reboot({
                    serverId: server.id,
                  })
                }
              />
            </ActionPanel>
          }
        />
        {Object.entries({
          mysql: "MySQL",
          nginx: "NGINX",
          supervisor: "Supervisor",
        }).map(([key, label]) => {
          return (
            <List.Item
              id={key}
              key={key}
              title={`Restart ${label}`}
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    icon={Icon.ArrowClockwise}
                    title={`Restart ${label}`}
                    onAction={async () =>
                      await Server.restartService({
                        serverId: server.id,
                        service: key,
                        label: label,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          id="refresh-opcache"
          key="refresh-opcache"
          title="Refresh OPcache"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                icon={Icon.ArrowClockwise}
                title="Refresh OPcache"
                onAction={async () =>
                  await Server.refreshOpCache({
                    serverId: server.id,
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};

export const ServerCommands = ({ server }: { server: IServer }) => {
  const sshUser = getPreferenceValues()?.ploi_ssh_user?.value ?? "ploi";
  return (
    <>
      <Action.OpenInBrowser
        icon={Icon.Terminal}
        title={`SSH As User ${sshUser}`}
        url={`ssh://${sshUser}@${server.ipAddress}:${server.sshPort}`}
      />
      <ActionPanel.Item
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => Server.reboot({ serverId: server.id })}
      />
      <Action.CopyToClipboard title="Copy IP Address" content={server.ipAddress} />
      <Action.OpenInBrowser title="Open in ploi.io" url={`${PLOI_PANEL_URL}/servers/${server.id}`} />
    </>
  );
};

export interface IServer {
  id: number;
  type: string;
  name: string;
  ipAddress: string;
  internalIp: string;
  phpVersion: string;
  mysqlVersion: string;
  sitesCount: number;
  status: string;
  statusId: number;
  createdAt: string;
  phpCliVersion: string;
  sshPort: number;
  databaseType: string;
  opcache: boolean;
}
