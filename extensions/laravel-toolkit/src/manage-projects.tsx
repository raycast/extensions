import {
  ActionPanel,
  Action,
  List,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Form,
  useNavigation,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getProjects, removeProject, saveProject, Project } from "./utils/projects";
import { openInEditor } from "./utils/editor";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    const projectList = await getProjects();
    setProjects(projectList);
    setIsLoading(false);
  }

  async function handleRemove(project: Project) {
    const confirmed = await confirmAlert({
      title: "Remove Project",
      message: `Remove "${project.name}" from the list? (This won't delete any files)`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      await removeProject(project.path);
      await loadProjects();
      showToast({ style: Toast.Style.Success, title: "Project removed" });
    }
  }

  async function handleOpenInEditor(project: Project) {
    await openInEditor(project.path);
  }

  async function openExternalTerminal(projectPath: string) {
    const command = `start powershell -NoExit -Command "Set-Location '${projectPath}'"`;
    exec(command, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Open Terminal",
          message: error.message,
        });
      }
    });
    await closeMainWindow();
  }

  function getKitLabel(kit?: string): string {
    if (!kit || kit === "imported") return "Imported Project";
    if (kit === "none") return "Bare Laravel";
    return kit.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async function handleImport(folderPath: string) {
    if (!fs.existsSync(path.join(folderPath, "artisan"))) {
      showToast({
        style: Toast.Style.Failure,
        title: "Not a Laravel Project",
        message: "The selected folder doesn't appear to be a Laravel project (no artisan file found)",
      });
      return false;
    }

    const projectName = path.basename(folderPath);
    await saveProject({
      path: folderPath,
      name: projectName,
      createdAt: new Date().toISOString(),
      baseKit: "imported",
    });

    await loadProjects();
    showToast({ style: Toast.Style.Success, title: "Project Imported", message: projectName });
    return true;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects..." isShowingDetail>
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Yet"
          description="Create a new project or import an existing one"
          actions={
            <ActionPanel>
              <Action.Push
                title="Import Existing Project"
                icon={Icon.Plus}
                target={<ImportProjectForm onImport={handleImport} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.path}
            icon={Icon.Folder}
            title={project.name}
            detail={<ProjectDetailView project={project} kitLabel={getKitLabel(project.baseKit)} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open">
                  <Action title="Open in Editor" icon={Icon.Code} onAction={() => handleOpenInEditor(project)} />
                  <Action.Open title="Open in File Explorer" icon={Icon.Finder} target={project.path} />
                  <Action
                    title="Open Terminal"
                    icon={Icon.Terminal}
                    onAction={() => openExternalTerminal(project.path)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Actions">
                  <Action.Push
                    title="Import Existing Project"
                    icon={Icon.Plus}
                    target={<ImportProjectForm onImport={handleImport} />}
                  />
                  <Action.CopyToClipboard title="Copy Path" content={project.path} />
                  <Action
                    title="Remove from List"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemove(project)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

import { getProjectDetails, ProjectDetails } from "./utils/project-details";

function ProjectDetailView({ project, kitLabel }: { project: Project; kitLabel: string }) {
  const [details, setDetails] = useState<ProjectDetails | null>(null);

  useEffect(() => {
    let isMounted = true;
    getProjectDetails(project.path).then((d) => {
      if (isMounted) setDetails(d);
    });
    return () => {
      isMounted = false;
    };
  }, [project.path]);

  return (
    <List.Item.Detail
      isLoading={!details}
      markdown={`# ${project.name}
      
${project.path}

---

**Tech Stack**: ${details?.starterKit || kitLabel}

${details?.detectedDependencies ? `\n---\n**Debug: Detected Packages**\n\n${details.detectedDependencies.map((d) => `- ${d}`).join("\n")}` : ""}
`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Laravel Version" text={details?.laravelVersion || "Loading..."} />
          <List.Item.Detail.Metadata.Label title="PHP Version" text={details?.phpVersion || "Loading..."} />
          <List.Item.Detail.Metadata.Label title="Database" text={details?.database || "Loading..."} />
          <List.Item.Detail.Metadata.Label
            title="Debug Mode"
            text={details ? (details.debugMode ? "Enabled" : "Disabled") : "Loading..."}
            icon={details?.debugMode ? Icon.CheckCircle : Icon.Circle}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Added" text={new Date(project.createdAt).toLocaleDateString()} />
          {details?.starterKit === "Standard" && details?.detectedDependencies && (
            <List.Item.Detail.Metadata.Label
              title="Debug: Packages Found"
              text={details.detectedDependencies.length.toString()}
              icon={Icon.Bug}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ImportProjectForm({ onImport }: { onImport: (path: string) => Promise<boolean> }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { folder: string[] }) {
    if (values.folder && values.folder.length > 0) {
      const success = await onImport(values.folder[0]);
      if (success) {
        pop();
      }
    } else {
      showToast({ style: Toast.Style.Failure, title: "No folder selected" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Project" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Project Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
