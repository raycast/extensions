import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Server } from "./types";
import { fetchServerStatus, ServerStatus } from "./utils";
import AddServerCommand from "./add-server";
import EditServer from "./edit-server";

interface ServerWithStatus extends Server {
  status?: ServerStatus;
  loading: boolean;
}

export default function Command() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    setIsLoading(true);
    try {
      const storedServers = await LocalStorage.getItem<string>("servers");
      if (storedServers) {
        const parsedServers: Server[] = JSON.parse(storedServers);
        const serversWithLoading: ServerWithStatus[] = parsedServers.map(
          (s) => ({
            ...s,
            status: servers.find((existing) => existing.id === s.id)?.status,
            loading: true,
          }),
        );
        setServers(serversWithLoading);

        await Promise.all(
          parsedServers.map(async (server) => {
            const status = await fetchServerStatus(server);
            setServers((prev) => {
              const newServers = [...prev];
              const serverIndex = newServers.findIndex(
                (s) => s.id === server.id,
              );
              if (serverIndex !== -1) {
                newServers[serverIndex] = {
                  ...newServers[serverIndex],
                  status,
                  loading: false,
                };
              }
              return newServers;
            });
          }),
        );
      } else {
        setServers([]);
      }
    } catch (error) {
      console.error("Failed to load servers", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load servers",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function moveServerUp(index: number) {
    if (index === 0) return;
    const newServers = [...servers];
    [newServers[index - 1], newServers[index]] = [
      newServers[index],
      newServers[index - 1],
    ];
    setServers(newServers);
    const serversToSave = newServers.map((s) => ({
      id: s.id,
      name: s.name,
      ip: s.ip,
      port: s.port,
      type: s.type,
      createdAt: s.createdAt,
    }));
    await LocalStorage.setItem("servers", JSON.stringify(serversToSave));
  }

  async function moveServerDown(index: number) {
    if (index === servers.length - 1) return;
    const newServers = [...servers];
    [newServers[index + 1], newServers[index]] = [
      newServers[index],
      newServers[index + 1],
    ];
    setServers(newServers);
    const serversToSave = newServers.map((s) => ({
      id: s.id,
      name: s.name,
      ip: s.ip,
      port: s.port,
      type: s.type,
      createdAt: s.createdAt,
    }));
    await LocalStorage.setItem("servers", JSON.stringify(serversToSave));
  }

  async function removeServer(id: string) {
    const newServers = servers.filter((s) => s.id !== id);
    setServers(newServers);
    const serversToSave = newServers.map((s) => ({
      id: s.id,
      name: s.name,
      ip: s.ip,
      port: s.port,
      type: s.type,
      createdAt: s.createdAt,
    }));
    await LocalStorage.setItem("servers", JSON.stringify(serversToSave));
    showToast({ title: "Server removed", style: Toast.Style.Success });
  }

  return (
    <List
      isLoading={isLoading || servers.some((s) => s.loading)}
      isShowingDetail={servers.length > 0}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={loadServers}
          />
          <Action.Push
            title="Add New Server"
            target={<AddServerCommand />}
            icon={Icon.Plus}
            onPop={loadServers}
          />
        </ActionPanel>
      }
    >
      {servers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Servers Added"
          description="Add a Minecraft server using the 'Add Server' command to check its status."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Server"
                target={<AddServerCommand />}
                icon={Icon.Plus}
                onPop={loadServers}
              />
            </ActionPanel>
          }
        />
      ) : (
        servers.map((server, index) => (
          <ServerListItem
            key={server.id}
            server={server}
            index={index}
            totalServers={servers.length}
            onRemove={removeServer}
            onRefresh={loadServers}
            onMoveUp={() => moveServerUp(index)}
            onMoveDown={() => moveServerDown(index)}
          />
        ))
      )}
    </List>
  );
}

function ServerListItem({
  server,
  index,
  totalServers,
  onRemove,
  onRefresh,
  onMoveUp,
  onMoveDown,
}: {
  server: ServerWithStatus;
  index: number;
  totalServers: number;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { status, loading } = server;

  let icon: Image.ImageLike = {
    source: Icon.Circle,
    tintColor: Color.SecondaryText,
  };
  let statusText = "Offline";

  if (!loading && status) {
    if (status.online) {
      icon = status.icon
        ? { source: status.icon, tintColor: undefined }
        : { source: Icon.CheckCircle, tintColor: Color.Green };
      statusText = "Online";
    } else {
      icon = { source: Icon.XMarkCircle, tintColor: Color.Red };
    }
  }

  /* Large hero image, name, and clean MOTD */
  const heroImage = status?.icon ? `![Likely Server Icon](${status.icon})` : "";
  const markdown = `
${heroImage}

# ${server.name}

${
  status?.online
    ? `
${status.motd}
`
    : `
_Server is currently offline or unreachable._
`
}
`;

  // Logic to determine what to copy
  const copyContent =
    (server.type === "java" && server.port === 25565) ||
    (server.type === "bedrock" && server.port === 19132)
      ? server.ip
      : `${server.ip}:${server.port}`;

  return (
    <List.Item
      title={server.name}
      subtitle={
        status?.online
          ? `${status.players?.online}/${status.players?.max}`
          : "Offline"
      }
      icon={icon}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Address"
                text={copyContent}
              />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={statusText}
                icon={
                  status?.online
                    ? { source: Icon.CircleFilled, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.Red }
                }
              />
              {status?.online && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Version"
                    text={status.version}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Latency"
                    text={`${status.latency}ms`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Players"
                    text={`${status.players?.online} / ${status.players?.max}`}
                  />
                </>
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={
                  server.type === "java" ? "Java Edition" : "Bedrock Edition"
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {status?.players?.sample && status.players.sample.length > 0 ? (
            <Action.Push
              title="View Player List"
              target={
                <PlayerList
                  players={status.players.sample}
                  serverName={server.name}
                />
              }
              icon={Icon.Person}
            />
          ) : (
            <Action
              title="Refresh"
              icon={Icon.RotateAntiClockwise}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
              onAction={onRefresh}
            />
          )}

          <Action.Push
            title="Edit Server"
            target={<EditServer server={server} onEdit={onRefresh} />}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["ctrl"], key: "e" }}
          />

          <Action.CopyToClipboard
            title="Copy Server IP"
            content={copyContent}
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
          />

          {index > 0 && (
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowUp" }}
              onAction={onMoveUp}
            />
          )}
          {index < totalServers - 1 && (
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowDown" }}
              onAction={onMoveDown}
            />
          )}

          <Action.Push
            title="Add New Server"
            target={<AddServerCommand />}
            icon={Icon.Plus}
            onPop={onRefresh}
          />

          <Action
            title="Remove Server"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "d" }}
            onAction={() => onRemove(server.id)}
          />

          {/* Fallback Refresh if View Player List is primary */}
          {status?.players?.sample && status.players.sample.length > 0 && (
            <Action
              title="Refresh"
              icon={Icon.RotateAntiClockwise}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
              onAction={onRefresh}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function PlayerList({
  players,
  serverName,
}: {
  players: { name: string; id: string }[];
  serverName: string;
}) {
  return (
    <List navigationTitle={`Players - ${serverName}`}>
      {players.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          icon={{
            source: `https://mc-heads.net/avatar/${p.id}`,
            fallback: Icon.Person,
          }}
          subtitle={p.id}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://namemc.com/profile/${p.id}`}
                title="Open NameMC Profile"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
