import { Action, ActionPanel, Color, confirmAlert, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { platform } from "os";
import { discoverMenuShortcuts } from "./scanner";
import type { DiscoveredApp } from "./scanner";
import { applyDiscovery, isSameDiscoverItem } from "./discover";
import type { Shortcut } from "./types";
import { loadShortcuts, saveShortcuts } from "./data";

interface ScanState {
  apps: DiscoveredApp[];
  failedApps: string[];
  readFiles: string[];
  existing: Shortcut[];
}

export default function Command() {
  const { pop } = useNavigation();
  const [state, setState] = useState<ScanState>();
  const [error, setError] = useState<string>();

  const isMac = platform() === "darwin";
  if (!isMac) {
    return (
      <List navigationTitle="Discover Shortcuts">
        <List.EmptyView
          title="Discover is macOS-only"
          description="App menu shortcut scanning relies on macOS preferences. Use Import from JSON to bring shortcuts in here."
        />
      </List>
    );
  }

  useEffect(() => {
    let alive = true;
    Promise.all([discoverMenuShortcuts(), loadShortcuts()])
      .then(([result, existing]) => {
        if (alive)
          setState({ apps: result.apps, failedApps: result.failedApps, readFiles: result.readFiles, existing });
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!state || error) {
    return (
      <List isLoading={!error} navigationTitle="Discover Shortcuts">
        <List.EmptyView
          title={error ? "Scan failed" : state ? "No menu shortcut customizations found" : "Scanning apps…"}
          description={error ?? (state ? "Apps whose menus you customized in System Settings appear here" : undefined)}
        />
      </List>
    );
  }

  const scan = state;
  const incoming = scan.apps.flatMap((a) => a.shortcuts);

  const replaces = (s: Shortcut) =>
    scan.existing.some(
      (e) =>
        e.source === "discover" &&
        isSameDiscoverItem(e, s) &&
        e.keys.toLowerCase().replace(/\s+/g, " ").trim() !== s.keys.toLowerCase().replace(/\s+/g, " ").trim()
    );

  async function commit(outcome: ReturnType<typeof applyDiscovery>) {
    await saveShortcuts(outcome.next);
    showToast({
      style: Toast.Style.Success,
      title: `Imported ${outcome.added.length} shortcut${outcome.added.length === 1 ? "" : "s"}`,
      message: outcome.removed.length > 0 ? `${outcome.removed.length} outdated replaced` : undefined,
    });
    pop();
  }

  async function importAll() {
    const outcome = applyDiscovery(scan.existing, incoming, true, scan.readFiles);
    const confirmed = await confirmAlert({
      title: "Import discovered shortcuts?",
      message: `${outcome.added.length} to add, ${outcome.removed.length} outdated to remove.${
        scan.failedApps.length > 0
          ? `\n\n${scan.failedApps.length} preference file(s) unreadable — shortcuts imported from them won't be touched.`
          : ""
      }`,
      primaryAction: { title: "Import" },
    });
    if (!confirmed) return;
    await commit(outcome);
  }

  return (
    <List navigationTitle="Discover Shortcuts" searchBarPlaceholder="Filter discovered shortcuts...">
      {scan.apps.map((app) => (
        <List.Section
          key={app.shortcuts[0]?.sourceFile ?? app.app}
          title={app.app}
          subtitle={`${app.shortcuts.length}`}
        >
          {app.shortcuts.map((s) => (
            <List.Item
              key={s.id}
              title={s.title}
              subtitle={replaces(s) ? "replaces imported copy" : undefined}
              keywords={[s.keys]}
              accessories={[{ text: { value: s.keys, color: Color.SecondaryText } }]}
              actions={
                <ActionPanel>
                  <Action title="Import All" onAction={importAll} />
                  <Action
                    title={`Import "${s.title}"`}
                    onAction={() => {
                      const outcome = applyDiscovery(scan.existing, [s], false);
                      return commit(outcome);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {incoming.length === 0 && (
        <List.EmptyView title="No menu shortcut customizations found" description="Nothing to import right now" />
      )}
      <List.Item
        title={`Import All (${incoming.length})`}
        actions={
          <ActionPanel>
            <Action
              title="Import All"
              onAction={() => {
                return importAll();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
