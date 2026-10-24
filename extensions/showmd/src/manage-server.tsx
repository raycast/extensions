import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import {
  loadManageStatus,
  restartShowmdServerAt,
  startShowmdServer,
  stopAllShowmdServers,
  stopShowmdServerAt,
} from "./lib/raycast-glue";
import {
  isMainServer,
  labelForServer,
  orderedServersByMode,
  urlForPort,
  urlForRootPath,
  type ManageStatus,
  type ServerInfo,
} from "./lib/showmd";
import FeedbackSection from "./components/FeedbackSection";
import { useToastLoader } from "./hooks/use-toast-loader";

export default function ManageServer() {
  const { isLoading, setIsLoading, run } = useToastLoader(
    "Could not load ShowMD status",
  );
  const [status, setStatus] = useState<ManageStatus | null>(null);

  async function refresh() {
    await run(async () => {
      const next = await loadManageStatus();
      setStatus(next);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleStart() {
    setIsLoading(true);
    await startShowmdServer();
    await refresh();
  }

  async function handleStopAll() {
    setIsLoading(true);
    await stopAllShowmdServers();
    await refresh();
  }

  const servers = status?.servers ?? [];
  const running = status?.running ?? false;

  if (!isLoading && !running) {
    return (
      <List isLoading={isLoading}>
        <List.Item
          icon={Icon.Circle}
          title="ShowMD is not running"
          actions={
            <ActionPanel>
              <Action
                title="Start ShowMD"
                icon={Icon.Play}
                onAction={handleStart}
              />
              <FeedbackSection />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  function serverActions(server: ServerInfo, openUrl: string) {
    return (
      <ActionPanel>
        <Action
          title="Open in Browser"
          icon={Icon.Globe}
          onAction={() => open(openUrl)}
        />
        <Action
          title="Restart"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            setIsLoading(true);
            await restartShowmdServerAt(server);
            await refresh();
          }}
        />
        <Action
          title="Stop"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={async () => {
            setIsLoading(true);
            await stopShowmdServerAt(server);
            await refresh();
          }}
        />
        {servers.length > 1 && (
          <Action
            title="Stop All"
            icon={Icon.XMarkCircleFilled}
            style={Action.Style.Destructive}
            onAction={handleStopAll}
          />
        )}
        <FeedbackSection />
      </ActionPanel>
    );
  }

  function serverItems(server: ServerInfo) {
    const mainAccessory = isMainServer(server) ? [{ tag: "Main" }] : [];
    if (server.roots.length <= 1) {
      return [
        <List.Item
          key={server.port}
          icon={Icon.CheckCircle}
          title={labelForServer(server)}
          subtitle={`Port ${server.port}`}
          accessories={[
            ...mainAccessory,
            {
              text: server.version ? `v${server.version}` : undefined,
              tooltip: urlForPort(server.port),
            },
          ]}
          actions={serverActions(server, urlForPort(server.port))}
        />,
      ];
    }
    return server.roots.map((root) => (
      <List.Item
        key={`${server.port}:${root.key}`}
        icon={Icon.CheckCircle}
        title={root.name}
        subtitle={`Port ${server.port}`}
        accessories={mainAccessory}
        actions={serverActions(server, urlForRootPath(server.port, root.url))}
      />
    ));
  }

  const orderedServers = orderedServersByMode(servers);

  return <List isLoading={isLoading}>{orderedServers.map(serverItems)}</List>;
}
