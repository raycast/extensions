import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadProjects, saveProjects } from "./storage";
import { spawnRsync, RsyncProcess } from "./rsync";
import { Project, SyncDirection, SyncMode, SyncRecord } from "./types";

// ─── Sync Output Detail View ──────────────────────────────────────────────────

function SyncOutputView({
  project,
  direction,
  mode,
  prefs,
  onDone,
}: {
  project: Project;
  direction: SyncDirection;
  mode: SyncMode;
  prefs: Preferences;
  onDone: (record: SyncRecord) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let lineCount = 0;
    let child: RsyncProcess | undefined;

    const toastPromise = showToast({
      style: Toast.Style.Animated,
      title: mode === "dry" ? "Dry-run running…" : `${direction === "push" ? "Push" : "Pull"} running…`,
      message: project.name,
    });

    (async () => {
      const toast = await toastPromise;
      try {
        const runningChild = await spawnRsync(project, direction, mode, prefs);
        child = runningChild;
        runningChild.all?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          for (const line of text.split("\n")) {
            if (line.trim() && !line.includes("setlocale")) {
              if (mounted) setLines((prev) => [...prev, line]);
              lineCount++;
            }
          }
        });

        const result = await runningChild.result;
        if (!mounted) return;

        setRunning(false);
        setExitCode(result.exitCode ?? 1);

        const success = result.exitCode === 0;
        const record: SyncRecord = {
          timestamp: new Date().toISOString(),
          direction,
          mode,
          success,
          linesOutput: lineCount,
        };
        onDone(record);

        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = mode === "dry" ? "Dry-run complete" : "Sync complete";
          toast.message = `${lineCount} lines`;
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Sync failed";
          toast.message = `Exit code ${result.exitCode}`;
        }
      } catch (err) {
        console.error("rsync child error:", err);
        if (!mounted) return;
        setRunning(false);
        setExitCode(1);
        const t = await toastPromise;
        t.style = Toast.Style.Failure;
        t.title = "Sync failed";
      }
    })();

    return () => {
      mounted = false;
      try {
        child?.kill();
      } catch (err) {
        console.error("failed to kill rsync child:", err);
      }
    };
  }, []);

  const dirLabel = direction === "push" ? "local → IONOS" : "IONOS → local";
  const modeLabel = mode === "dry" ? "🔍 Dry-run" : direction === "push" ? "⬆️ Push" : "⬇️ Pull";
  const statusIcon = running ? "⏳" : exitCode === 0 ? "✅" : "❌";

  const markdownOutput = lines.length > 0 ? "```\n" + lines.join("\n") + "\n```" : "*Waiting for output…*";

  const markdown = `# ${modeLabel} — ${project.name}

**Direction:** ${dirLabel}
**Status:** ${statusIcon} ${running ? "running…" : exitCode === 0 ? "Done" : `Error (exit ${exitCode})`}
**Lines:** ${lines.length}

---

${markdownOutput}
`;

  return (
    <Detail
      isLoading={running}
      markdown={markdown}
      actions={
        !running ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Output" content={lines.join("\n")} icon={Icon.Clipboard} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// ─── Direction Picker ─────────────────────────────────────────────────────────

function DirectionPicker({
  project,
  prefs,
  onDone,
}: {
  project: Project;
  prefs: Preferences;
  onDone: (record: SyncRecord) => void;
}) {
  const { push } = useNavigation();

  function launch(direction: SyncDirection, mode: SyncMode) {
    push(<SyncOutputView project={project} direction={direction} mode={mode} prefs={prefs} onDone={onDone} />);
  }

  const isRoot = project.remotePath === "~" || project.remotePath === "~/";

  return (
    <List navigationTitle={`Sync — ${project.name}`}>
      <List.Section title={`Project: ${project.name}`} subtitle={`${project.localPath} ↔ ${project.remotePath}`}>
        <List.Item
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Dry-run (preview)"
          subtitle="Shows what would change — nothing is transferred"
          actions={
            <ActionPanel>
              <Action title="Start Dry-Run" onAction={() => launch("push", "dry")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowUp, tintColor: Color.Green }}
          title="Push — local → IONOS"
          subtitle={isRoot ? "⚠️ Root-sync: --delete disabled" : "Transfers changes to server"}
          actions={
            <ActionPanel>
              <Action title="Start Push" onAction={() => launch("push", "live")} />
              <Action title="Dry-Run First" onAction={() => launch("push", "dry")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowDown, tintColor: Color.Orange }}
          title="Pull — IONOS → local"
          subtitle="Fetches changes from server"
          actions={
            <ActionPanel>
              <Action title="Start Pull" onAction={() => launch("pull", "live")} />
              <Action title="Dry-Run First" onAction={() => launch("pull", "dry")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─── Project List (Main Command) ──────────────────────────────────────────────

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects()
      .then((p) => {
        setProjects(p);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        void showToast({ style: Toast.Style.Failure, title: "Failed to load projects" });
      });
  }, []);

  function formatLastSync(record?: SyncRecord): string {
    if (!record) return "Never synced";
    const d = new Date(record.timestamp);
    const dateStr = d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dir = record.direction === "push" ? "↑" : "↓";
    const mode = record.mode === "dry" ? " (dry)" : "";
    const ok = record.success ? "✓" : "✗";
    return `${ok} ${dir} ${dateStr} ${timeStr}${mode}`;
  }

  function lastSyncColor(record?: SyncRecord): Color {
    if (!record) return Color.SecondaryText;
    if (!record.success) return Color.Red;
    if (record.mode === "dry") return Color.Blue;
    return Color.Green;
  }

  async function handleSyncDone(project: Project, record: SyncRecord) {
    const updated = projects.map((p) => (p.id === project.id ? { ...p, lastSync: record } : p));
    setProjects(updated);
    await saveProjects(updated);
  }

  if (!prefs.ionosHost || !prefs.ionosUser) {
    return (
      <Detail
        markdown={`# ⚠️ Credentials missing

Please open **Extension Preferences** to enter your host and username.

Press \`⌘ + ,\` while IONOS Sync is selected.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Extension Preferences" url="raycast://preferences/extensions" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="IONOS Sync">
      <List.Section title="Projects" subtitle={`${projects.length} configured`}>
        {projects.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.Globe}
            title={project.name}
            subtitle={project.localPath}
            accessories={[
              {
                text: formatLastSync(project.lastSync),
                icon: {
                  source: project.lastSync ? Icon.Clock : Icon.Circle,
                  tintColor: lastSyncColor(project.lastSync),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Start Sync"
                  icon={Icon.ArrowClockwise}
                  onAction={() =>
                    push(
                      <DirectionPicker
                        project={project}
                        prefs={prefs}
                        onDone={(record) => handleSyncDone(project, record)}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {projects.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No projects configured"
          description='Run the "Manage Projects" command to add your first project'
        />
      )}
    </List>
  );
}
