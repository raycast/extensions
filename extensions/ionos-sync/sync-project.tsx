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
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadProjects, saveProjects } from "./storage";
import { runRsync, Preferences } from "./rsync";
import {
  Project,
  SyncDirection,
  SyncMode,
  SyncRecord,
  STORAGE_KEY,
} from "./types";

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

    async function run() {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: mode === "dry" ? "Dry-run läuft…" : `${direction === "push" ? "Push" : "Pull"} läuft…`,
        message: project.name,
      });

      const result = await runRsync(project, direction, mode, prefs, (line) => {
        if (mounted) setLines((prev) => [...prev, line]);
      });

      if (!mounted) return;

      setRunning(false);
      setExitCode(result.exitCode);

      const success = result.exitCode === 0;
      const record: SyncRecord = {
        timestamp: new Date().toISOString(),
        direction,
        mode,
        success,
        linesOutput: result.output.length,
      };
      onDone(record);

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = mode === "dry" ? "Dry-run abgeschlossen" : "Sync erfolgreich";
        toast.message = `${result.output.length} Zeilen Output`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Fehler beim Sync";
        toast.message = `Exit Code ${result.exitCode}`;
      }
    }

    run();
    return () => { mounted = false; };
  }, []);

  const dirLabel = direction === "push" ? "lokal → IONOS" : "IONOS → lokal";
  const modeLabel = mode === "dry" ? "🔍 Dry-run" : direction === "push" ? "⬆️ Push" : "⬇️ Pull";
  const statusIcon = running
    ? "⏳"
    : exitCode === 0 ? "✅" : "❌";

  const markdownOutput = lines.length > 0
    ? "```\n" + lines.join("\n") + "\n```"
    : "*Warte auf Output…*";

  const markdown = `# ${modeLabel} — ${project.name}

**Richtung:** ${dirLabel}  
**Status:** ${statusIcon} ${running ? "läuft…" : exitCode === 0 ? "Fertig" : `Fehler (Exit ${exitCode})`}  
**Zeilen:** ${lines.length}

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
            <Action.CopyToClipboard
              title="Output kopieren"
              content={lines.join("\n")}
              icon={Icon.Clipboard}
            />
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
    push(
      <SyncOutputView
        project={project}
        direction={direction}
        mode={mode}
        prefs={prefs}
        onDone={onDone}
      />
    );
  }

  const isRoot = !project.deleteOnSync;

  return (
    <List navigationTitle={`Sync — ${project.name}`}>
      <List.Section title={`Projekt: ${project.name}`} subtitle={`${project.localPath} ↔ ${project.remotePath}`}>
        <List.Item
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Dry-run (Vorschau)"
          subtitle="Zeigt was sich ändern würde — nichts wird übertragen"
          actions={
            <ActionPanel>
              <Action title="Dry-run starten" onAction={() => launch("push", "dry")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowUp, tintColor: Color.Green }}
          title="Push — lokal → IONOS"
          subtitle={isRoot ? "⚠️ Root-Sync: --delete deaktiviert" : "Überträgt Änderungen zum Server"}
          actions={
            <ActionPanel>
              <Action title="Push starten" onAction={() => launch("push", "live")} />
              <Action title="Erst Dry-run" onAction={() => launch("push", "dry")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowDown, tintColor: Color.Orange }}
          title="Pull — IONOS → lokal"
          subtitle="Holt Änderungen vom Server"
          actions={
            <ActionPanel>
              <Action title="Pull starten" onAction={() => launch("pull", "live")} />
              <Action title="Erst Dry-run" onAction={() => launch("pull", "dry")} />
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
    loadProjects().then((p) => {
      setProjects(p);
      setIsLoading(false);
    });
  }, []);

  function formatLastSync(record?: SyncRecord): string {
    if (!record) return "Noch nicht synchronisiert";
    const d = new Date(record.timestamp);
    const dateStr = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const timeStr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
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
    const updated = projects.map((p) =>
      p.id === project.id ? { ...p, lastSync: record } : p
    );
    setProjects(updated);
    await saveProjects(updated);
  }

  if (!prefs.ionosHost || !prefs.ionosUser) {
    return (
      <Detail
        markdown={`# ⚠️ Zugangsdaten fehlen

Bitte öffne die **Extension-Einstellungen** und trage Host und Benutzername ein.

\`⌘ + ,\` → IONOS Sync → Einstellungen`}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="IONOS Sync">
      <List.Section title="Projekte" subtitle={`${projects.length} konfiguriert`}>
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
                  title="Sync starten"
                  icon={Icon.ArrowClockwise}
                  onAction={() =>
                    push(
                      <DirectionPicker
                        project={project}
                        prefs={prefs}
                        onDone={(record) => handleSyncDone(project, record)}
                      />
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
