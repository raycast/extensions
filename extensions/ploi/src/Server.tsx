import {
  ActionPanel,
  allLocalStorageItems,
  CopyToClipboardAction,
  Icon,
  List,
  LocalStorageValues,
  OpenInBrowserAction,
  preferences,
  PushAction,
  setLocalStorageItem,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Server } from "./api/Server";
import { Site } from "./api/Site";
import { ISite, SitesList } from "./Site";
import { useIsMounted } from "./helpers";
import { PLOI_PANEL_URL } from "./config";

export const ServersList = () => {
  const [servers, setServers] = useState<IServer[]>([]);
  const [siteData, setSiteData] = useState<LocalStorageValues>({});
  const isMounted = useIsMounted();

  const fetchAndCacheSites = async (serverId: string) => {
    const key = `ploi-sites-${serverId.toString()}`;
    // If the sites already exist in the cache, or not found, do nothing
    if (siteData[key] || !isMounted.current) return;
    const server = servers.find((s) => s.id.toString() === serverId) as IServer;
    if (!server) return;
    if (!Object.keys(server).length) return;
    const thisSiteData = (await Site.getAll(server)) as ISite[] | undefined;
    thisSiteData &&
      (await setLocalStorageItem(
        `ploi-sites-${serverId}`,
        JSON.stringify(thisSiteData)
      ));
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    allLocalStorageItems()
      .then((data) => {
        setIsLoading(false);
        if (!isMounted.current) return;
        const servers = data["ploi-servers"];
        delete data["ploi-servers"];
        const serverList = JSON.parse(
          servers?.toString() ?? "[]"
        ) as Array<IServer>;
        setServers(serverList?.length ? serverList : []);
        setSiteData(data ?? {});
      })
      .finally(() => {
        setIsLoading(false);
        if (!isMounted.current) return;
        Server.getAll().then(async (servers: Array<IServer> | undefined) => {
          if (!isMounted.current) return;
          // Add the server list to storage to avoid content flash
          servers && setServers(servers);
          await setLocalStorageItem("ploi-servers", JSON.stringify(servers));
        });
      });
  }, []);

  if (!servers?.length && !isLoading) {
    return (
      <List>
        <List.Item
          title="There are no results to display."
          accessoryTitle="If you create your first server in ploi.io, it will show up here."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Servers..."
      onSelectionChange={(serverId) => serverId && fetchAndCacheSites(serverId)}
    >
      {servers.map((server: IServer) => {
        const key = `ploi-sites-${server.id.toString()}`;
        const sites = JSON.parse(siteData[key] ?? "[]") as ISite[];
        return <ServerListItem key={server.id} server={server} sites={sites} />;
      })}
    </List>
  );
};

const ServerListItem = ({
  server,
  sites,
}: {
  server: IServer;
  sites: ISite[];
}) => {
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      title={server.name}
      icon={{
        source: {
          light: "server.png",
          dark: "server-dark.png",
        },
      }}
      accessoryTitle={server.ipAddress}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction
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

const SingleServerView = ({
  server,
  sites,
}: {
  server: IServer;
  sites: ISite[];
}) => {
  const sshUser = preferences?.ploi_ssh_user?.value ?? "ploi";
  return (
    <List searchBarPlaceholder="Search Sites...">
      <List.Section
        title={`Sites on server ${server.name} · ${sites.length} site(s)`}
      >
        <SitesList server={server} sites={sites} />
      </List.Section>
      <List.Section title="Server Information">
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH Connection (${sshUser})`}
          icon={Icon.Terminal}
          accessoryTitle={`ssh://${sshUser}@${server.ipAddress}`}
          actions={
            <ActionPanel>
              <OpenInBrowserAction
                title={`SSH In As User ${sshUser}`}
                url={`ssh://${sshUser}@${server.ipAddress}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-ploi"
          key="open-in-ploi"
          title="Open in ploi.io"
          icon={Icon.Globe}
          accessoryTitle="ploi.io"
          actions={
            <ActionPanel>
              <OpenInBrowserAction
                url={`${PLOI_PANEL_URL}/servers/${server.id}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-ip"
          key="copy-ip"
          title="Copy IP Address"
          icon={Icon.Clipboard}
          accessoryTitle={server.ipAddress}
          actions={
            <ActionPanel>
              <CopyToClipboardAction
                title="Copy IP Address"
                content={server.ipAddress}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="server-id"
          key="server-id"
          title="Server ID"
          icon={Icon.Document}
          accessoryTitle={`${server.id}`}
          actions={
            <ActionPanel>
              <CopyToClipboardAction content={server.id ?? ""} />
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
  const sshUser = preferences?.ploi_ssh_user?.value ?? "ploi";
  return (
    <>
      <OpenInBrowserAction
        icon={Icon.Terminal}
        title={`SSH As User ${sshUser}`}
        url={`ssh://${sshUser}@${server.ipAddress}:${server.sshPort}`}
      />
      <ActionPanel.Item
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => Server.reboot({ serverId: server.id })}
      />
      <CopyToClipboardAction
        title="Copy IP Address"
        content={server.ipAddress}
      />
      <OpenInBrowserAction
        title="Open in ploi.io"
        url={`${PLOI_PANEL_URL}/servers/${server.id}`}
      />
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
