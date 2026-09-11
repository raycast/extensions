import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import {
  loadManageStatus,
  loadRecents,
  openInShowmd,
  startShowmdServer,
  stopShowmdServerAt,
} from "./lib/raycast-glue";
import {
  describeMenuBar,
  isDarwin,
  isMainServer,
  labelForServer,
  orderedServersByMode,
  tildify,
  urlForPort,
  urlForRootPath,
  type ManageStatus,
  type RecentEntry,
  type ServerInfo,
} from "./lib/showmd";
import { MenuBarFeedbackSection } from "./components/FeedbackSection";
import { useToastLoader } from "./hooks/use-toast-loader";
import path from "node:path";

// Solid mark when the server is running, dimmed when it's stopped; light/dark
// pairs so the glyph stays visible against either menu bar background.
const MENU_BAR_ICON = {
  running: {
    source: {
      light: "menu-bar-light-running.png",
      dark: "menu-bar-dark-running.png",
    },
  },
  stopped: {
    source: {
      light: "menu-bar-light-stopped.png",
      dark: "menu-bar-dark-stopped.png",
    },
  },
};

// Menu bar Space names drop labelForServer's "Showing " prefix and the port
// (kept elsewhere, e.g. Manage ShowMD) — the menu bar shows just the name.
function spaceLabel(server: ServerInfo): string {
  const label = labelForServer(server);
  return label.startsWith("Showing ") ? label.slice("Showing ".length) : label;
}

export default function MenuBar() {
  const { isLoading, run } = useToastLoader("Could not load ShowMD status");
  const [status, setStatus] = useState<ManageStatus | null>(null);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  async function refresh() {
    await run(async () => {
      const next = await loadManageStatus();
      setStatus(next);
      setRecents(next.running ? await loadRecents() : []);
    });
  }

  const isMac = isDarwin(process.platform);

  useEffect(() => {
    if (isMac) refresh();
    else
      showToast({
        style: Toast.Style.Failure,
        title: "Menu Bar is macOS only",
      });
  }, []);

  if (!isMac) return null;

  const menuBar = status ? describeMenuBar(status) : null;
  const running = menuBar?.running ?? false;
  const servers = status?.servers ?? [];
  const orderedServers = orderedServersByMode(servers);
  const tooltip = menuBar?.subtitle;

  function serverSubmenu(server: ServerInfo) {
    const title = isMainServer(server)
      ? `${spaceLabel(server)} (Main)`
      : spaceLabel(server);
    return (
      <MenuBarExtra.Submenu
        key={server.port}
        title={title}
        icon={Icon.CheckCircle}
      >
        {server.roots.length > 1 &&
          server.roots.map((root) => (
            <MenuBarExtra.Item
              key={root.key}
              title={root.name}
              onAction={() => open(urlForRootPath(server.port, root.url))}
            />
          ))}
        <MenuBarExtra.Item
          title="Open in Browser"
          icon={Icon.Globe}
          onAction={() => open(urlForPort(server.port))}
        />
        <MenuBarExtra.Item
          title="Stop"
          icon={Icon.XMarkCircle}
          onAction={async () => {
            await stopShowmdServerAt(server);
            await refresh();
          }}
        />
      </MenuBarExtra.Submenu>
    );
  }

  return (
    <MenuBarExtra
      icon={running ? MENU_BAR_ICON.running : MENU_BAR_ICON.stopped}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {running ? (
        <MenuBarExtra.Section>
          {orderedServers.map(serverSubmenu)}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="ShowMD (stopped)" />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Recents">
        {recents.length === 0 ? (
          <MenuBarExtra.Item title="No recent files" />
        ) : (
          recents.map((entry) => (
            <MenuBarExtra.Item
              key={entry.path}
              title={path.basename(entry.path)}
              subtitle={tildify(path.dirname(entry.path))}
              onAction={() => openInShowmd(entry.path)}
            />
          ))
        )}
      </MenuBarExtra.Section>
      {!running && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Start"
            icon={Icon.Play}
            onAction={async () => {
              await startShowmdServer();
              await refresh();
            }}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarFeedbackSection />
    </MenuBarExtra>
  );
}
