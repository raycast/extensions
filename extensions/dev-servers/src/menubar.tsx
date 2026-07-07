import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  updateCommandMetadata,
} from "@raycast/api";
import { useFrecencySorting, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_TERMINAL } from "./constants";
import { RecentProject, STORAGE_KEY } from "./recents";
import {
  canonicalCwd,
  fetchServers,
  killServer,
  restartServer,
} from "./servers";
import { readSnapshot, writeSnapshot } from "./snapshot";
import { toolColor } from "./tool-display";
import { DevServer } from "./types";

function metadataSubtitle(count: number): string {
  return count === 1 ? "1 running" : `${count} running`;
}

function serverHost(server: DevServer): string {
  const url =
    server.customUrls && server.customUrls.length > 0
      ? server.customUrls[0]
      : server.localUrl;
  try {
    return new URL(url).host;
  } catch {
    return server.customUrls && server.customUrls.length > 0
      ? server.customUrls[0]
      : `localhost:${server.port}`;
  }
}

function serverTitle(server: DevServer): string {
  const branch = server.branch ? ` (${server.branch})` : "";
  return `${serverHost(server)}${branch}`;
}

function groupByProject(servers: DevServer[]): DevServer[][] {
  const groups = new Map<string, DevServer[]>();
  for (const server of servers) {
    const group = groups.get(server.projectKey) ?? [];
    group.push(server);
    groups.set(server.projectKey, group);
  }
  return [...groups.values()];
}

async function launchDashboard(): Promise<void> {
  await launchCommand({
    name: "index",
    type: LaunchType.UserInitiated,
  });
}

async function launchStartPicker(): Promise<void> {
  await launchCommand({
    name: "start",
    type: LaunchType.UserInitiated,
    context: { forcePicker: true },
  });
}

async function launchRecent(recent: RecentProject): Promise<void> {
  await launchCommand({
    name: "index",
    type: LaunchType.UserInitiated,
    context: {
      spawn: {
        targets: [{ cwd: recent.cwd, name: recent.projectName }],
        confirmMulti: false,
        autoOpen: false,
        showAutoOpenHint: false,
      },
    },
  });
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Menubar>();
  const [servers, setServers] = useState<DevServer[]>(
    () => readSnapshot() ?? [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const { value: recents = [] } = useLocalStorage<RecentProject[]>(
    STORAGE_KEY,
    [],
  );

  const refresh = useCallback(async () => {
    const next = await fetchServers();
    setServers(next);
    writeSnapshot(next);
    await updateCommandMetadata({ subtitle: metadataSubtitle(next.length) });
    return next;
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const runningCwds = useMemo(
    () => new Set(servers.map((server) => canonicalCwd(server.cwd))),
    [servers],
  );

  const startableRecents = useMemo(
    () =>
      recents
        .filter((recent) => !runningCwds.has(canonicalCwd(recent.cwd)))
        .sort((a, b) => b.lastSeen - a.lastSeen),
    [recents, runningCwds],
  );

  const { data: sortedRecents, visitItem } = useFrecencySorting(
    startableRecents,
    {
      namespace: "project-starts",
      key: (item) => item.cwd,
      sortUnvisited: (a, b) => b.lastSeen - a.lastSeen,
    },
  );

  const terminalApp = prefs.terminalApp ?? DEFAULT_TERMINAL;
  const editorApp = prefs.editorApp;
  const title =
    (prefs.showCount ?? true) && servers.length > 0
      ? String(servers.length)
      : undefined;

  return (
    <MenuBarExtra
      icon={Icon.Bolt}
      title={title}
      tooltip="Dev Servers"
      isLoading={isLoading}
    >
      {servers.length === 0 ? (
        <MenuBarExtra.Item title="No dev servers running" />
      ) : (
        groupByProject(servers).map((projectServers) => (
          <MenuBarExtra.Section
            key={projectServers[0].projectKey}
            title={projectServers[0].projectName}
          >
            {projectServers.map((server) => (
              <MenuBarExtra.Submenu
                key={`${server.pid}:${server.port}`}
                title={serverTitle(server)}
                icon={{
                  source: Icon.CircleFilled,
                  tintColor: toolColor(server.tool),
                }}
              >
                <MenuBarExtra.Item
                  title="Open in Browser"
                  icon={Icon.Globe}
                  onAction={() => {
                    void open(server.url);
                  }}
                />
                {server.customUrls && server.customUrls.length > 0 ? (
                  <MenuBarExtra.Item
                    title="Open Localhost URL"
                    icon={Icon.Link}
                    onAction={() => {
                      void open(server.localUrl);
                    }}
                  />
                ) : null}
                <MenuBarExtra.Separator />
                <MenuBarExtra.Item
                  title="Restart"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    void (async () => {
                      await restartServer(server);
                      await refresh();
                    })();
                  }}
                />
                <MenuBarExtra.Item
                  title="Kill"
                  icon={Icon.Trash}
                  onAction={() => {
                    void (async () => {
                      await killServer(server.pid);
                      await refresh();
                    })();
                  }}
                />
                <MenuBarExtra.Separator />
                <MenuBarExtra.Item
                  title="Copy URL"
                  icon={Icon.Clipboard}
                  onAction={() => {
                    void Clipboard.copy(server.url);
                  }}
                />
                <MenuBarExtra.Item
                  title="Copy Port"
                  icon={Icon.NumberList}
                  onAction={() => {
                    void Clipboard.copy(server.port);
                  }}
                />
                {editorApp ? (
                  <MenuBarExtra.Item
                    title="Open in Editor"
                    icon={Icon.Code}
                    onAction={() => {
                      void open(server.cwd, editorApp);
                    }}
                  />
                ) : null}
                <MenuBarExtra.Item
                  title="Open in Terminal"
                  icon={Icon.Terminal}
                  onAction={() => {
                    void open(server.cwd, terminalApp);
                  }}
                />
              </MenuBarExtra.Submenu>
            ))}
            {projectServers.length >= 2 ? (
              // No confirmAlert in the menu bar context, so the guardrails are
              // the label carrying the count, bottom placement, and hiding the
              // item entirely for single-server projects (where the per-server
              // Kill already covers it).
              <MenuBarExtra.Item
                title={
                  projectServers.length === 2
                    ? "Kill Both Servers"
                    : `Kill All ${projectServers.length} Servers`
                }
                icon={Icon.Trash}
                onAction={() => {
                  void (async () => {
                    // allSettled: a server can die between menu open and click,
                    // and one stale pid must not stop the rest of the project.
                    await Promise.allSettled(
                      projectServers.map((server) => killServer(server.pid)),
                    );
                    await refresh();
                  })();
                }}
              />
            ) : null}
          </MenuBarExtra.Section>
        ))
      )}

      {sortedRecents.length > 0 ? (
        // Section titles render even over zero children, so an empty recents
        // list (or one fully hidden by the running set) must drop the whole
        // section rather than strand a bare "Start" header.
        <MenuBarExtra.Section title="Start">
          {sortedRecents.slice(0, 6).map((recent) => (
            <MenuBarExtra.Item
              key={recent.cwd}
              title={recent.projectName}
              subtitle={recent.branch}
              icon={recent.favicon ?? Icon.Folder}
              onAction={() => {
                void (async () => {
                  await visitItem(recent);
                  await launchRecent(recent);
                })();
              }}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.Window}
          onAction={() => {
            void launchDashboard();
          }}
        />
        <MenuBarExtra.Item
          title="Start Dev Server…"
          icon={Icon.Plus}
          onAction={() => {
            void launchStartPicker();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
