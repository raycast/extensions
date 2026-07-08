import {
  Clipboard,
  Color,
  Image,
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
  directoryExists,
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

// The URL locator shown (in parentheses) after the project name: the custom
// domain host when one points at this server (e.g. "ragi.loc"), otherwise just
// the port ("9292"). "localhost" is dropped — the port alone disambiguates
// same-project servers, which is what matters when several run at once.
function serverLocator(server: DevServer): string {
  const custom =
    server.customUrls && server.customUrls.length > 0
      ? server.customUrls[0]
      : undefined;
  if (custom) {
    try {
      return new URL(custom).host;
    } catch {
      return custom;
    }
  }
  return server.port;
}

// Row title for a running server: "<project> (<locator>) · <branch>". The
// project name leads (the section header is dropped, so this is where it
// shows), then the port/domain in parens, then the branch. It's a submenu,
// which has no subtitle, so everything sits on one line at one weight — the
// parens and " · " separator stand in for the dimming we can't apply.
function serverTitle(server: DevServer): string {
  const head = `${server.projectName} (${serverLocator(server)})`;
  return server.branch ? `${head} · ${server.branch}` : head;
}

function menuIconSource(name: string): Image.Source {
  return {
    light: `menubar-${name}.svg`,
    dark: `menubar-${name}@dark.svg`,
  };
}

function menuIcon(name: string): Image.ImageLike {
  return { source: menuIconSource(name) };
}

function tintedMenuIcon(
  name: string,
  tintColor: Color.ColorLike,
): Image.ImageLike {
  return { source: menuIconSource(name), tintColor };
}

// Raycast renders SVG images in the menu bar as a monochrome template — they
// show up as a solid black blob — whereas raster images (PNG/ICO) keep their
// color. A cached favicon is a data URI; if it's an SVG we can't use it here.
// (The dashboard renders in a List, which shows SVGs in full color, so its
// favicons are unaffected.)
function isSvgDataUri(uri: string): boolean {
  return uri.startsWith("data:image/svg");
}

// The raster favicon to show for a project in the menu bar, or undefined when
// there isn't a usable one. Prefers `faviconRaster` (the raster variant the
// dashboard resolves specifically for the menu bar), then the shared `favicon`
// when that's already a raster. An SVG-only project has neither and falls back
// to the framework-tinted glyph.
function menuBarFavicon(recent: RecentProject): string | undefined {
  if (recent.faviconRaster) return recent.faviconRaster;
  if (recent.favicon && !isSvgDataUri(recent.favicon)) return recent.favicon;
  return undefined;
}

// Icon for a running server row. Reuses the favicon the dashboard already
// resolved and cached onto the project's recents entry — the menu bar never
// fetches favicons itself, to stay cheap on its background interval. Projects
// with no usable cached favicon (never opened in the dashboard, or only an SVG
// favicon which the menu bar can't render in color) fall back to the
// framework-tinted server glyph.
function serverIcon(
  server: DevServer,
  faviconByCwd: Map<string, string>,
): Image.ImageLike {
  const favicon = faviconByCwd.get(canonicalCwd(server.cwd));
  return favicon
    ? { source: favicon, fallback: menuIconSource("server") }
    : tintedMenuIcon("server", toolColor(server.tool));
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

async function launchRecent(
  recent: RecentProject,
  autoOpen: boolean,
): Promise<void> {
  await launchCommand({
    name: "index",
    type: LaunchType.UserInitiated,
    context: {
      spawn: {
        targets: [{ cwd: recent.cwd, name: recent.projectName }],
        confirmMulti: false,
        autoOpen,
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

  // Raster favicons the dashboard cached onto recents, keyed by canonical cwd,
  // so running rows can show the project's real icon without a network fetch.
  // menuBarFavicon skips SVG-only projects (the menu bar renders SVGs as a
  // black blob), so those rows keep the framework-tinted glyph instead.
  const faviconByCwd = useMemo(() => {
    const map = new Map<string, string>();
    for (const recent of recents) {
      const favicon = menuBarFavicon(recent);
      if (favicon) map.set(canonicalCwd(recent.cwd), favicon);
    }
    return map;
  }, [recents]);

  const startableRecents = useMemo(
    () =>
      recents
        .filter(
          (recent) =>
            // Skip running projects (the dashboard owns them) and entries whose
            // folder no longer exists on disk — e.g. a deleted git worktree.
            // Mirrors the Start command's filter so the two lists stay in sync.
            !runningCwds.has(canonicalCwd(recent.cwd)) &&
            directoryExists(recent.cwd),
        )
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
  const autoOpen = prefs.autoOpenInBrowser ?? false;
  const title =
    (prefs.showCount ?? true) && servers.length > 0
      ? String(servers.length)
      : undefined;

  return (
    <MenuBarExtra
      icon={menuIcon("server")}
      title={title}
      tooltip="Dev Servers"
      isLoading={isLoading}
    >
      {servers.length === 0 ? (
        <MenuBarExtra.Item title="No dev servers running" />
      ) : (
        groupByProject(servers).map((projectServers) => (
          // No section title: the project name now leads each row (serverTitle).
          // The title-less section still renders a divider between projects and
          // hosts the per-project "Kill All" item.
          <MenuBarExtra.Section key={projectServers[0].projectKey}>
            {projectServers.map((server) => (
              <MenuBarExtra.Submenu
                key={`${server.pid}:${server.port}`}
                title={serverTitle(server)}
                icon={serverIcon(server, faviconByCwd)}
              >
                <MenuBarExtra.Item
                  title="Open in Browser"
                  icon={menuIcon("open-browser")}
                  onAction={() => {
                    void open(server.url);
                  }}
                />
                {server.customUrls && server.customUrls.length > 0 ? (
                  <MenuBarExtra.Item
                    title="Open Localhost URL"
                    icon={menuIcon("local-link")}
                    onAction={() => {
                      void open(server.localUrl);
                    }}
                  />
                ) : null}
                <MenuBarExtra.Separator />
                <MenuBarExtra.Item
                  title="Restart"
                  icon={menuIcon("restart")}
                  onAction={() => {
                    void (async () => {
                      await restartServer(server);
                      await refresh();
                    })();
                  }}
                />
                <MenuBarExtra.Item
                  title="Kill"
                  icon={tintedMenuIcon("kill", Color.Red)}
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
                  icon={menuIcon("copy-url")}
                  onAction={() => {
                    void Clipboard.copy(server.url);
                  }}
                />
                <MenuBarExtra.Item
                  title="Copy Port"
                  icon={menuIcon("copy-port")}
                  onAction={() => {
                    void Clipboard.copy(server.port);
                  }}
                />
                {editorApp ? (
                  <MenuBarExtra.Item
                    title="Open in Editor"
                    icon={menuIcon("editor")}
                    onAction={() => {
                      void open(server.cwd, editorApp);
                    }}
                  />
                ) : null}
                <MenuBarExtra.Item
                  title="Open in Terminal"
                  icon={menuIcon("terminal")}
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
                icon={tintedMenuIcon("kill", Color.Red)}
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
              icon={
                menuBarFavicon(recent) ??
                tintedMenuIcon(
                  "folder",
                  recent.tool ? toolColor(recent.tool) : Color.SecondaryText,
                )
              }
              onAction={() => {
                void (async () => {
                  await visitItem(recent);
                  await launchRecent(recent, autoOpen);
                })();
              }}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={menuIcon("dashboard")}
          onAction={() => {
            void launchDashboard();
          }}
        />
        <MenuBarExtra.Item
          title="Start Dev Server…"
          icon={menuIcon("start")}
          onAction={() => {
            void launchStartPicker();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
