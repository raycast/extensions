import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Color,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useExec } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FETCH_SCRIPT,
  killProcess,
  parseServers,
  restartServer,
} from "./servers";
import { DevServer } from "./types";

const DEFAULT_TERMINAL: Application = {
  name: "Terminal",
  path: "/System/Applications/Utilities/Terminal.app",
  bundleId: "com.apple.Terminal",
};

function formatUptime(startedAt: Date): string {
  const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 0) return "?";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// Theme-adaptive overrides for the few frameworks where the named palette
// renders too muddy or too low-contrast against Raycast's translucent tag
// background, especially on selected rows in dark mode. The rest fall
// through to the named palette which works fine.
const TOOL_COLOR_OVERRIDES: Record<string, { light: string; dark: string }> = {
  // Purples: deepened in light mode for readable contrast
  vite: { light: "#5B21B6", dark: "#B49CFF" },
  astro: { light: "#5B21B6", dark: "#B49CFF" },
  gatsby: { light: "#5B21B6", dark: "#B49CFF" },
  // Yellows: Raycast's Color.Yellow is too pale in light mode, so use a deeper
  // amber there. Keep a warm yellow in dark mode where it reads fine.
  parcel: { light: "#A16207", dark: "#FDE047" },
  esbuild: { light: "#A16207", dark: "#FDE047" },
  bun: { light: "#A16207", dark: "#FDE047" },
  // Next: Tailwind gray-900 / gray-100 (blue-tinted gray, not neutral)
  next: { light: "#111827", dark: "#F3F4F6" },
};

function toolColor(tool: string): Color | { light: string; dark: string } {
  const key = tool.toLowerCase();
  if (TOOL_COLOR_OVERRIDES[key]) return TOOL_COLOR_OVERRIDES[key];
  const colors: Record<string, Color> = {
    nuxt: Color.Green,
    webpack: Color.Blue,
    svelte: Color.Orange,
    sveltekit: Color.Orange,
    remix: Color.Magenta,
    turbo: Color.Blue,
    node: Color.Green,
  };
  return colors[key] ?? Color.Blue;
}

// Fetch with a hard 3s timeout. Returns null on any failure so callers can
// chain fallbacks cleanly without nested try/catch.
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Verify a URL actually serves an image (HEAD 200). Skipping this check
// would let us cache a 404'd favicon path, causing Raycast to render its
// untinted grey-globe fallback instead of our nicer tinted placeholder.
async function urlExists(url: string): Promise<boolean> {
  const res = await fetchWithTimeout(url, { method: "HEAD" });
  return !!res && res.ok;
}

// Resolve the best favicon URL for a localhost dev server. Tries in order:
//  1. <link rel="icon"> in the page HTML (HEAD-validated)
//  2. /favicon.ico (the convention every framework starter ships with)
//  3. undefined → caller renders a framework-tinted globe instead.
async function detectFaviconUrl(port: string): Promise<string | undefined> {
  const origin = `http://localhost:${port}`;

  // 1. Page <link rel="icon">
  const html = await fetchWithTimeout(`${origin}/`).then((r) =>
    r ? r.text() : null,
  );
  if (html) {
    const linkTags = html.match(/<link[^>]+>/gi) ?? [];
    for (const tag of linkTags) {
      if (/rel=["'][^"']*icon[^"']*["']/i.test(tag)) {
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
          const url = href.startsWith("http")
            ? href
            : `${origin}${href.startsWith("/") ? href : `/${href}`}`;
          if (await urlExists(url)) return url;
        }
      }
    }
  }

  // 2. /favicon.ico fallback
  const icoUrl = `${origin}/favicon.ico`;
  if (await urlExists(icoUrl)) return icoUrl;

  return undefined;
}

interface ServerItemProps {
  server: DevServer;
  terminalApp: Application;
  onKill: () => void;
  onKillProject: () => void;
  onKillAll: () => void;
  onRestart: () => void;
  onRefresh: () => void;
}

function ServerItem({
  server,
  terminalApp,
  onKill,
  onKillProject,
  onKillAll,
  onRestart,
  onRefresh,
}: ServerItemProps) {
  // Cache the favicon URL by port. Survives revalidations and command
  // relaunches, so the icon doesn't flash back to a placeholder every
  // refresh interval. keepPreviousData keeps the prior URL visible while
  // a fresh fetch is in flight.
  const { data: faviconUrl } = useCachedPromise(
    detectFaviconUrl,
    [server.port],
    {
      keepPreviousData: true,
    },
  );
  const icon: Image.ImageLike = faviconUrl
    ? { source: faviconUrl, fallback: Icon.Globe }
    : { source: Icon.Globe, tintColor: toolColor(server.tool) };

  return (
    <List.Item
      icon={icon}
      title={`localhost:${server.port}`}
      accessories={[
        {
          text: formatUptime(server.startedAt),
          tooltip: `Started ${server.startedAt.toLocaleString()}`,
        },
        // Show the runtime tag only when it adds new information.
        // If the framework tag is already "bun", a second "bun" tag is just noise.
        ...(server.runtime === "bun" && server.tool !== "bun"
          ? [
              {
                tag: { value: "bun", color: Color.Yellow },
                tooltip: "Listening process is running on the Bun runtime",
              },
            ]
          : []),
        { tag: { value: server.tool, color: toolColor(server.tool) } },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={server.url} title="Open in Browser" />
          <Action
            title="Kill Server"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onKill}
          />
          {/* CopyToClipboard already uses Cmd+C by default */}
          <Action.CopyToClipboard title="Copy URL" content={server.url} />
          <Action
            title="Restart Server"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onRestart}
          />
          <ActionPanel.Section>
            <Action.Open
              title={`Open in ${terminalApp.name}`}
              icon={Icon.Terminal}
              target={server.cwd}
              application={terminalApp}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action.ShowInFinder
              path={server.cwd}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Kill All for Project"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onKillProject}
            />
            <Action
              title="Kill All Servers"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
              onAction={onKillAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Index>();

  const {
    isLoading,
    data: servers = [],
    mutate,
    revalidate,
  } = useExec("/bin/zsh", ["-c", FETCH_SCRIPT], {
    parseOutput: ({ stdout }) => parseServers(stdout),
    keepPreviousData: true,
  });

  useEffect(() => {
    const id = setInterval(revalidate, parseInt(prefs.refreshInterval) * 1000);
    return () => clearInterval(id);
  }, [prefs.refreshInterval, revalidate]);

  // Mirror `servers` into a ref so async handlers (like restart's polling
  // loop) can read the latest value without going stale on closure capture.
  const serversRef = useRef(servers);
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  async function kill(pid: number) {
    try {
      await mutate(killProcess(pid), {
        optimisticUpdate: (current) =>
          (current ?? []).filter((s) => s.pid !== pid),
        rollbackOnError: true,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to kill server" });
    }
  }

  async function killProject(cwd: string) {
    const targets = servers.filter((s) => s.cwd === cwd);
    if (targets.length === 0) return;
    const projectName = targets[0].projectName;
    const confirmed = await confirmAlert({
      title: `Kill all servers for ${projectName}?`,
      message: `This will stop ${targets.length} server${targets.length > 1 ? "s" : ""}.`,
      primaryAction: {
        title: "Kill",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    });
    if (!confirmed) return;
    try {
      await mutate(
        (async () => {
          await Promise.all(targets.map((s) => killProcess(s.pid)));
        })(),
        {
          optimisticUpdate: (current) =>
            (current ?? []).filter((s) => s.cwd !== cwd),
          rollbackOnError: true,
        },
      );
    } catch (err) {
      await showFailureToast(err, {
        title: `Failed to kill servers for ${projectName}`,
      });
    }
  }

  async function killAll() {
    if (servers.length === 0) return;
    const confirmed = await confirmAlert({
      title: "Kill all dev servers?",
      message: `This will stop all ${servers.length} running server${servers.length > 1 ? "s" : ""} across every project.`,
      primaryAction: {
        title: "Kill All",
        style: Alert.ActionStyle.Destructive,
      },
      // Intentionally NO rememberUserChoice. The nuclear option always confirms.
    });
    if (!confirmed) return;
    try {
      await mutate(
        (async () => {
          await Promise.all(servers.map((s) => killProcess(s.pid)));
        })(),
        {
          optimisticUpdate: () => [],
          rollbackOnError: true,
        },
      );
    } catch (err) {
      await showFailureToast(err, { title: "Failed to kill all servers" });
    }
  }

  async function restart(server: DevServer) {
    // Snapshot the project's server count BEFORE killing the old one so we
    // can detect when a new server has bound a port. We use serversRef.current
    // so we always see the latest state across the polling loop.
    const baseline = serversRef.current.filter(
      (s) => s.cwd === server.cwd && s.pid !== server.pid,
    ).length;
    try {
      await mutate(restartServer(server), {
        optimisticUpdate: (current) =>
          (current ?? []).filter((s) => s.pid !== server.pid),
        rollbackOnError: false,
      });
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Restarting…",
        message: server.projectName,
      });
      // Poll at staggered intervals up to ~10s. Bail early as soon as the
      // server count for this project rises above baseline (new port bound).
      const delays = [1000, 2000, 3000, 4000];
      let restored = false;
      for (const delay of delays) {
        await new Promise((r) => setTimeout(r, delay));
        await revalidate();
        const current = serversRef.current.filter(
          (s) => s.cwd === server.cwd,
        ).length;
        if (current > baseline) {
          restored = true;
          break;
        }
      }
      if (restored) {
        toast.style = Toast.Style.Success;
        toast.title = "Restarted";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Restart timed out";
        toast.message = "Check /tmp/dev-servers-restart-*.log";
      }
    } catch (err) {
      await showFailureToast(err, {
        title: `Failed to restart ${server.projectName}`,
      });
    }
  }

  const terminalApp = prefs.terminalApp ?? DEFAULT_TERMINAL;
  const [toolFilter, setToolFilter] = useState<string>("all");

  // Manual refresh: useExec's revalidate is silent because keepPreviousData
  // keeps the list rendered. Show a brief animated toast so the user knows
  // their ⌘R actually did something.
  async function refresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing…",
    });
    try {
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed";
    } catch (err) {
      await showFailureToast(err, { title: "Refresh failed" });
    }
  }

  // Unique tools currently visible. Drives the dropdown options.
  const availableTools = useMemo(() => {
    const seen = new Set<string>();
    for (const s of servers) seen.add(s.tool);
    return Array.from(seen).sort();
  }, [servers]);

  const visible =
    toolFilter === "all"
      ? servers
      : servers.filter((s) => s.tool === toolFilter);

  const grouped = Object.entries(
    visible.reduce(
      (acc, s) => {
        (acc[s.cwd] ??= []).push(s);
        return acc;
      },
      {} as Record<string, DevServer[]>,
    ),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter servers..."
      searchBarAccessory={
        availableTools.length > 1 ? (
          <List.Dropdown
            tooltip="Filter by tool"
            value={toolFilter}
            onChange={setToolFilter}
          >
            <List.Dropdown.Item title="All Tools" value="all" />
            <List.Dropdown.Section>
              {availableTools.map((tool) => (
                <List.Dropdown.Item key={tool} title={tool} value={tool} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {servers.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Dev Servers Running"
          description={`Start a dev server and it will appear here.\nRefreshing every ${prefs.refreshInterval}s.`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
      {grouped.map(([cwd, projectServers]) => (
        <List.Section
          key={cwd}
          title={prefs.showFullPath ? cwd : projectServers[0].projectName}
          subtitle={`${projectServers.length} server${projectServers.length > 1 ? "s" : ""}`}
        >
          {projectServers.map((server) => (
            <ServerItem
              key={server.pid}
              server={server}
              terminalApp={terminalApp}
              onKill={() => kill(server.pid)}
              onKillProject={() => killProject(cwd)}
              onKillAll={killAll}
              onRestart={() => restart(server)}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
