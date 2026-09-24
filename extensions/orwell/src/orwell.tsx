import { List, ActionPanel, Action, Icon, showHUD, showToast, Toast, Color, open, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { detectServers, stopServer, restartServer, startServer, loadRegistry, removeEntry } from "./lib/index";
import type { DevServer } from "./lib/types";
import { spawn } from "node:child_process";

function frameworkLabel(fw: string): string {
  const labels: Record<string, string> = {
    next: "Next.js",
    vite: "Vite",
    nuxt: "Nuxt",
    astro: "Astro",
    remix: "Remix",
    gatsby: "Gatsby",
    angular: "Angular",
    ember: "Ember",
    "webpack-dev-server": "Webpack",
  };
  return labels[fw] || "Node.js";
}

export default function Command() {
  const {
    data: servers,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return await detectServers();
  }, []);

  const online = (servers ?? []).filter((s) => s.status === "online");
  const offline = (servers ?? []).filter((s) => s.status === "offline");

  return (
    <List isLoading={isLoading}>
      {online.length > 0 && (
        <List.Section title="Running" subtitle={`${online.length}`}>
          {online.map((server) => (
            <OnlineItem key={server.projectDir} server={server} revalidate={revalidate} />
          ))}
        </List.Section>
      )}

      {offline.length > 0 && (
        <List.Section title="Offline" subtitle={`${offline.length}`}>
          {offline.map((server) => (
            <OfflineItem key={server.projectDir} server={server} revalidate={revalidate} />
          ))}
        </List.Section>
      )}

      {!isLoading && (servers ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No dev servers found"
          description="Start a dev server and open Orwell again"
        />
      )}
    </List>
  );
}

function OnlineItem({ server, revalidate }: { server: DevServer; revalidate: () => void }) {
  return (
    <List.Item
      icon={server.faviconPath ? { source: server.faviconPath } : Icon.Globe}
      title={server.projectName}
      subtitle={server.projectDir}
      accessories={[
        { tag: { value: frameworkLabel(server.framework), color: Color.Purple } },
        { text: `:${server.port}` },
        { icon: { source: Icon.CircleFilled, tintColor: Color.Green } },
      ]}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
          <Action
            title="Stop"
            icon={Icon.Power}
            shortcut={{ modifiers: ["shift"], key: "return" }}
            onAction={async () => {
              await stopServer(server);
              await showHUD(`Stopped ${server.projectName}`);
              setTimeout(revalidate, 1500);
            }}
          />
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(server.url)}
          />
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => spawn("open", [server.projectDir])}
          />
          <Action
            title="Restart"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={async () => {
              await restartServer(server);
              await showHUD(`Restarting ${server.projectName}`);
              setTimeout(revalidate, 3000);
            }}
          />
          <Action.CopyToClipboard title="Copy URL" content={server.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}

function OfflineItem({ server, revalidate }: { server: DevServer; revalidate: () => void }) {
  return (
    <List.Item
      icon={server.faviconPath ? { source: server.faviconPath } : Icon.Monitor}
      title={server.projectName}
      subtitle={server.projectDir}
      accessories={[
        { tag: { value: frameworkLabel(server.framework), color: Color.SecondaryText } },
        { text: `:${server.port}` },
        { icon: { source: Icon.CircleFilled, tintColor: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Start"
            icon={Icon.Play}
            onAction={async () => {
              const registry = await loadRegistry();
              const entry = registry.find((e) => e.projectDir === server.projectDir);
              if (!entry) {
                await showToast({ style: Toast.Style.Failure, title: "Not in registry" });
                return;
              }
              await startServer(entry);
              await showHUD(`Starting ${server.projectName}`);
              setTimeout(revalidate, 3000);
            }}
          />
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => spawn("open", [server.projectDir])}
          />
          <Action
            title="Forget"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              await removeEntry(server.projectDir);
              await showHUD(`Removed ${server.projectName}`);
              revalidate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
