import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  showToast,
  Toast,
  closeMainWindow,
  Icon,
  getApplications,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { existsSync } from "fs";
import { AGENTS, KNOWN_TERMINALS, TERMINAL_STORAGE_KEY } from "./constants";
import { expandTilde, escapeForShell } from "./utils";
import { launchInTerminal } from "./terminal";
import { getRecentPaths, addRecentPath, removeRecentPath } from "./storage";

export default function Command() {
  const [agent, setAgent] = useState<string>("");
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [terminals, setTerminals] = useState<typeof KNOWN_TERMINALS>([]);
  const [terminal, setTerminal] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [terminalsLoaded, setTerminalsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getRecentPaths().then((paths) => {
      if (!mounted) return;
      setRecentPaths(paths);
      setRecentLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadTerminals() {
      const apps = await getApplications();
      if (!mounted) return;
      const bundleIds = new Set(apps.map((a) => a.bundleId));
      const available = KNOWN_TERMINALS.filter((t) => bundleIds.has(t.bundleId));
      if (mounted) setTerminals(available);

      const saved = await LocalStorage.getItem<string>(TERMINAL_STORAGE_KEY);
      if (!mounted) return;
      if (saved && available.some((t) => t.value === saved)) {
        setTerminal(saved);
      } else if (available.length > 0) {
        setTerminal(available[0].value);
      }

      if (mounted) setTerminalsLoaded(true);
    }
    loadTerminals();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setIsLoading(!(recentLoaded && terminalsLoaded));
  }, [recentLoaded, terminalsLoaded]);

  const currentTerminalTitle = terminals.find((t) => t.value === terminal)?.title ?? "Terminal";

  const filteredPaths = searchText
    ? recentPaths.filter((p) => p.toLowerCase().includes(searchText.toLowerCase()))
    : recentPaths;

  const showCustomPath = searchText && !recentPaths.includes(searchText);

  const launchSandbox = useCallback(
    async (path: string, terminalOverride?: string) => {
      const t = terminalOverride || terminal;

      if (!path.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Path cannot be empty" });
        return;
      }

      const expandedPath = expandTilde(path.trim());
      if (!existsSync(expandedPath)) {
        await showToast({ style: Toast.Style.Failure, title: "Path does not exist", message: expandedPath });
        return;
      }

      if (!agent) {
        await showToast({ style: Toast.Style.Failure, title: "No agent selected" });
        return;
      }

      if (!t) {
        await showToast({ style: Toast.Style.Failure, title: "No terminal app found" });
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Launching Hole sandbox..." });

      const updated = await addRecentPath(path);
      setRecentPaths(updated);

      const command = `hole start ${agent} ${escapeForShell(path)}`;

      try {
        await launchInTerminal(t, command);
        await LocalStorage.setItem(TERMINAL_STORAGE_KEY, t);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to launch sandbox",
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await closeMainWindow();
    },
    [agent, terminal],
  );

  const handleRemove = useCallback(async (path: string) => {
    const updated = await removeRecentPath(path);
    setRecentPaths(updated);
    await showToast({ style: Toast.Style.Success, title: "Removed from recent projects" });
  }, []);

  function buildActions(path: string, isRecent = false) {
    return (
      <ActionPanel>
        <Action title={`Launch in ${currentTerminalTitle}`} icon={Icon.Terminal} onAction={() => launchSandbox(path)} />
        {terminals.length > 1 && (
          <ActionPanel.Submenu title="Open in…" icon={Icon.Window}>
            {terminals.map((t) => (
              <Action key={t.value} title={t.title} onAction={() => launchSandbox(path, t.value)} />
            ))}
          </ActionPanel.Submenu>
        )}
        {isRecent && (
          <Action
            title="Remove from Recent"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => handleRemove(path)}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a project path..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Agent" storeValue={true} onChange={setAgent}>
          {AGENTS.map((a) => (
            <List.Dropdown.Item key={a.value} title={a.title} value={a.value} />
          ))}
        </List.Dropdown>
      }
    >
      {!searchText && recentPaths.length === 0 && (
        <List.EmptyView title="No Recent Projects" description="Type a project path to get started" />
      )}

      {showCustomPath && (
        <List.Item icon={Icon.Folder} title={searchText} subtitle="Use this path" actions={buildActions(searchText)} />
      )}

      {filteredPaths.length > 0 && (
        <List.Section title="Recent Projects">
          {filteredPaths.map((path) => (
            <List.Item key={path} icon={Icon.Clock} title={path} actions={buildActions(path, true)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
