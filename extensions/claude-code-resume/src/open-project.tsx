import { useEffect, useState } from "react";
import * as path from "path";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import {
  Backend,
  backendLabel,
  buildCommand,
  claudeStores,
  launchInteractive,
  readDirSafe,
} from "./lib/platform";
import { decodeProjectDir, loadSessions } from "./lib/sessions";

interface Project {
  cwd: string;
  label: string;
  backend: Backend;
  lastUsed?: number;
}

export default function OpenProject() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sessions = await loadSessions(1000);
      const map = new Map<string, Project>();
      for (const s of sessions) {
        const cur = map.get(s.cwd);
        if (!cur || (cur.lastUsed ?? 0) < s.mtime) {
          map.set(s.cwd, {
            cwd: s.cwd,
            label: path.basename(s.cwd) || s.cwd,
            backend: s.backend,
            lastUsed: s.mtime,
          });
        }
      }
      // Also surface project folders that have no parsed session yet, per store.
      for (const store of await claudeStores()) {
        const dir = path.join(store.root, "projects");
        for (const name of await readDirSafe(dir)) {
          const cwd = decodeProjectDir(name, store.backend);
          if (!map.has(cwd))
            map.set(cwd, {
              cwd,
              label: path.basename(cwd) || cwd,
              backend: store.backend,
            });
        }
      }
      setItems(
        [...map.values()].sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)),
      );
      setLoading(false);
    })();
  }, []);

  async function launch(p: Project, extra: string[]) {
    try {
      await closeMainWindow();
      await launchInteractive(p.cwd, extra, p.backend);
    } catch {
      const cmd = buildCommand(extra, p.cwd, p.backend);
      await Clipboard.copy(cmd);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't launch — command copied to clipboard",
        message: cmd,
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
    }
  }

  const mixed = new Set(items.map((p) => p.backend)).size > 1;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search projects by name or path"
    >
      {items.map((p) => (
        <List.Item
          key={p.cwd}
          title={p.label}
          subtitle={p.cwd}
          keywords={[p.cwd]}
          accessories={[
            ...(mixed ? [{ tag: backendLabel(p.backend) }] : []),
            ...(p.lastUsed ? [{ date: new Date(p.lastUsed) }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Start New Session"
                icon={Icon.Terminal}
                onAction={() => launch(p, [])}
              />
              <Action
                title="Continue Last Session"
                icon={Icon.ArrowRight}
                onAction={() => launch(p, ["--continue"])}
              />
              <Action.CopyToClipboard
                title="Copy Launch Command"
                content={buildCommand([], p.cwd, p.backend)}
              />
              <Action.CopyToClipboard
                title="Copy Directory Path"
                content={p.cwd}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
