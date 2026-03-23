import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Form,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { loadProjects, saveProjects, upsertProject, deleteProject, newProjectId } from "./storage";
import { Project, DEFAULT_EXCLUDES } from "./types";

// ─── Project Form (Add / Edit) ────────────────────────────────────────────────

function ProjectForm({
  existing,
  onSave,
}: {
  existing?: Project;
  onSave: (p: Project) => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | undefined>();
  const [remoteError, setRemoteError] = useState<string | undefined>();

  function handleSubmit(values: {
    name: string;
    localPath: string;
    remotePath: string;
    excludes: string;
    deleteOnSync: boolean;
  }) {
    let valid = true;

    if (!values.name.trim()) {
      setNameError("Name ist erforderlich");
      valid = false;
    }
    if (!values.localPath.trim()) {
      setLocalError("Lokaler Pfad ist erforderlich");
      valid = false;
    }
    if (!values.remotePath.trim()) {
      setRemoteError("Remote-Pfad ist erforderlich");
      valid = false;
    }
    if (!valid) return;

    const excludes = values.excludes
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const project: Project = {
      id: existing?.id ?? newProjectId(),
      name: values.name.trim(),
      localPath: values.localPath.trim(),
      remotePath: values.remotePath.trim(),
      excludes,
      deleteOnSync: values.deleteOnSync,
      lastSync: existing?.lastSync,
    };

    onSave(project);
    pop();
  }

  const defaultExcludes = (existing?.excludes ?? DEFAULT_EXCLUDES).join("\n");

  return (
    <Form
      navigationTitle={existing ? `Bearbeiten: ${existing.name}` : "Neues Projekt"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existing ? "Speichern" : "Projekt hinzufügen"}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="mein-projekt"
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="Eindeutiger Kurzname (wird in der Liste angezeigt)"
      />
      <Form.TextField
        id="localPath"
        title="Lokaler Pfad"
        placeholder="~/projects/mein-projekt/dist"
        defaultValue={existing?.localPath}
        error={localError}
        onChange={() => setLocalError(undefined)}
        info="Absoluter Pfad oder mit ~/ — der Inhalt dieses Ordners wird synchronisiert"
      />
      <Form.TextField
        id="remotePath"
        title="Remote-Pfad (IONOS)"
        placeholder="~/mein-projekt"
        defaultValue={existing?.remotePath}
        error={remoteError}
        onChange={() => setRemoteError(undefined)}
        info="Pfad auf dem IONOS-Server. ~/ = Home-Verzeichnis des SSH-Benutzers"
      />
      <Form.Separator />
      <Form.Checkbox
        id="deleteOnSync"
        label="--delete aktivieren (gelöschte lokale Dateien auch remote löschen)"
        defaultValue={existing?.deleteOnSync ?? true}
        info="Bei Root-Sync (~/) unbedingt deaktivieren — sonst Gefahr, andere Projekte zu löschen"
      />
      <Form.TextArea
        id="excludes"
        title="Excludes"
        placeholder={DEFAULT_EXCLUDES.join("\n")}
        defaultValue={defaultExcludes}
        info="Eine Exclude-Regel pro Zeile. Wildcards erlaubt (z.B. wp-*)"
        enableMarkdown={false}
      />
    </Form>
  );
}

// ─── Main Command ─────────────────────────────────────────────────────────────

export default function Command() {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects().then((p) => {
      setProjects(p);
      setIsLoading(false);
    });
  }, []);

  async function handleSave(project: Project) {
    const updated = await upsertProject(project);
    setProjects(updated);
    void showToast({ style: Toast.Style.Success, title: "Projekt gespeichert", message: project.name });
  }

  async function handleDelete(project: Project) {
    const confirmed = await confirmAlert({
      title: `"${project.name}" löschen?`,
      message: "Die Konfiguration wird entfernt. Dateien werden nicht gelöscht.",
      primaryAction: { title: "Löschen", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const updated = await deleteProject(project.id);
    setProjects(updated);
    void showToast({ style: Toast.Style.Success, title: "Projekt gelöscht", message: project.name });
  }

  function excludeSummary(p: Project): string {
    if (p.excludes.length === 0) return "Keine Excludes";
    return `${p.excludes.length} Excludes`;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Projekte verwalten"
      actions={
        <ActionPanel>
          <Action
            title="Projekt hinzufügen"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<ProjectForm onSave={handleSave} />)}
          />
        </ActionPanel>
      }
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Globe}
          title={project.name}
          subtitle={`${project.localPath} → ${project.remotePath}`}
          accessories={[
            {
              tag: {
                value: excludeSummary(project),
                color: project.excludes.length > 0 ? Color.Blue : Color.SecondaryText,
              },
            },
            {
              tag: {
                value: project.deleteOnSync ? "--delete" : "kein delete",
                color: project.deleteOnSync ? Color.Orange : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Bearbeiten"
                icon={Icon.Pencil}
                onAction={() => push(<ProjectForm existing={project} onSave={handleSave} />)}
              />
              <Action
                title="Projekt hinzufügen"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ProjectForm onSave={handleSave} />)}
              />
              <Action
                title="Löschen"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDelete(project)}
              />
            </ActionPanel>
          }
        />
      ))}

      {projects.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="Noch keine Projekte"
          description="Drücke ⌘N um ein Projekt hinzuzufügen"
        />
      )}
    </List>
  );
}
