import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { detectFastlane, normalizeShell } from "./detect";
import { createId } from "./id";
import { deleteProject, getProjects, saveProject } from "./storage";
import { FastlaneLane, FastlaneProject, Platform, Shell } from "./types";
import { platformIcon } from "./ui";

type ProjectValues = {
  name: string;
  rootPath: string[];
  workingDirectory: string[];
  envFilePath?: string[];
  shell: Shell;
  lanes: string;
};

function defaultLaneJson() {
  return JSON.stringify(
    [
      {
        name: "iOS Staging",
        platform: "ios",
        lane: "beta_staging",
        command: "bundle exec fastlane ios beta_staging",
        environment: "staging",
        isProduction: false,
      },
      {
        name: "iOS Production",
        platform: "ios",
        lane: "beta_production",
        command: "bundle exec fastlane ios beta_production",
        environment: "production",
        isProduction: true,
        expectedBranch: "main",
        requiredEnvVars: ["APP_STORE_CONNECT_API_KEY_CONTENT"],
      },
      {
        name: "Android Staging",
        platform: "android",
        lane: "beta_staging",
        command: "bundle exec fastlane android beta_staging",
        environment: "staging",
        isProduction: false,
      },
      {
        name: "Android Production",
        platform: "android",
        lane: "beta_production",
        command: "bundle exec fastlane android beta_production",
        environment: "production",
        isProduction: true,
        expectedBranch: "main",
        requiredEnvVars: ["APP_STORE_CONNECT_API_KEY_CONTENT"],
      },
    ],
    null,
    2,
  );
}

function parseLanes(value: string) {
  const raw = JSON.parse(value) as Partial<FastlaneLane>[];
  return raw.map((lane) => {
    if (!lane.name || !lane.platform || !lane.lane || !lane.command)
      throw new Error("Each lane needs name, platform, lane, and command");
    if (lane.platform !== "ios" && lane.platform !== "android")
      throw new Error("Lane platform must be ios or android");
    return {
      id: lane.id || createId("lane"),
      name: lane.name,
      platform: lane.platform as Platform,
      lane: lane.lane,
      command: lane.command,
      environment: lane.environment,
      isProduction: Boolean(lane.isProduction),
      expectedBranch: lane.expectedBranch,
      requiredEnvVars: lane.requiredEnvVars || [],
    };
  });
}

function ProjectForm(props: { project?: FastlaneProject; onSave: () => void }) {
  const { pop } = useNavigation();
  const project = props.project;
  const lanes = project?.lanes.length
    ? JSON.stringify(project.lanes, null, 2)
    : defaultLaneJson();

  async function submit(values: ProjectValues) {
    try {
      const rootPath = values.rootPath[0];
      const workingDirectory = values.workingDirectory[0] || rootPath;
      if (!rootPath || !workingDirectory)
        throw new Error("Project root and working directory are required");

      const now = new Date().toISOString();
      await saveProject({
        id: project?.id || createId("project"),
        name: values.name,
        rootPath,
        workingDirectory,
        envFilePath: values.envFilePath?.[0],
        shell: normalizeShell(values.shell),
        lanes: parseLanes(values.lanes),
        createdAt: project?.createdAt || now,
        updatedAt: now,
      });

      await showToast({ style: Toast.Style.Success, title: "Project saved" });
      props.onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save project",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={project?.name}
        placeholder="My App"
      />
      <Form.FilePicker
        id="rootPath"
        title="Project Root"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={project ? [project.rootPath] : []}
      />
      <Form.FilePicker
        id="workingDirectory"
        title="Fastlane Working Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={project ? [project.workingDirectory] : []}
      />
      <Form.FilePicker
        id="envFilePath"
        title="Env File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        defaultValue={project?.envFilePath ? [project.envFilePath] : []}
      />
      <Form.Dropdown
        id="shell"
        title="Shell"
        defaultValue={project?.shell || "zsh"}
      >
        <Form.Dropdown.Item value="zsh" title="zsh" />
        <Form.Dropdown.Item value="bash" title="bash" />
        <Form.Dropdown.Item value="sh" title="sh" />
      </Form.Dropdown>
      <Form.TextArea
        id="lanes"
        title="Lanes JSON"
        defaultValue={lanes}
        info="Add any iOS or Android Fastlane lanes. Commands are executed from the working directory."
      />
    </Form>
  );
}

function mergeDetectedLanes(project: FastlaneProject) {
  const detections = detectFastlane(project.rootPath);
  const existing = new Set(
    project.lanes.map((lane) => `${lane.platform}:${lane.lane}`),
  );
  const imported = detections
    .flatMap((detection) => detection.lanes)
    .filter((lane) => !existing.has(`${lane.platform}:${lane.lane}`))
    .map((lane) => ({ ...lane, id: createId("lane") }));

  return { detections, imported };
}

function DetectionDetail(props: {
  project: FastlaneProject;
  onImport: () => void;
}) {
  const detections = detectFastlane(props.project.rootPath);
  const markdown = detections.length
    ? detections
        .map((detection) => {
          const lanes =
            detection.lanes
              .map((lane) => `- ${lane.name}: \`${lane.command}\``)
              .join("\n") || "- No lanes detected";
          return `## ${detection.workingDirectory}\n\nFastfile: \`${detection.fastfilePath}\`\n\n${lanes}`;
        })
        .join("\n\n")
    : "No common Fastlane layouts were detected.";
  async function importLanes() {
    const { imported } = mergeDetectedLanes(props.project);
    if (!imported.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No new lanes to import",
      });
      return;
    }

    await saveProject({
      ...props.project,
      lanes: [...props.project.lanes, ...imported],
      updatedAt: new Date().toISOString(),
    });
    props.onImport();
    await showToast({
      style: Toast.Style.Success,
      title: "Lanes imported",
      message: `${imported.length} new lane${imported.length === 1 ? "" : "s"}`,
    });
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Import Detected Lanes"
            icon={Icon.Download}
            onAction={() => void importLanes()}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [projects, setProjects] = useState<FastlaneProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    setProjects(await getProjects());
    setIsLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function remove(project: FastlaneProject) {
    const confirmed = await confirmAlert({
      title: `Remove ${project.name}?`,
      message:
        "This removes the Raycast project config only. No project files are deleted.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteProject(project.id);
    await showToast({ style: Toast.Style.Success, title: "Project removed" });
    await refresh();
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() => push(<ProjectForm onSave={refresh} />)}
          />
        </ActionPanel>
      }
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.workingDirectory}
          icon={Icon.Hammer}
          accessories={[
            { text: `${project.lanes.length} lanes` },
            {
              text: project.envFilePath ? "env file" : "shell env",
              icon: {
                source: Icon.Key,
                tintColor: project.envFilePath
                  ? Color.Green
                  : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Project"
                icon={Icon.Pencil}
                target={<ProjectForm project={project} onSave={refresh} />}
              />
              <Action.Push
                title="Detect Fastlane"
                icon={Icon.MagnifyingGlass}
                target={
                  <DetectionDetail project={project} onImport={refresh} />
                }
              />
              <Action.CopyToClipboard
                title="Copy Config JSON"
                content={JSON.stringify(project, null, 2)}
              />
              <Action
                title="Remove Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void remove(project)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!projects.length && !isLoading ? (
        <List.EmptyView
          title="No Fastlane projects configured"
          description="Add a project to configure iOS and Android lanes."
          icon={platformIcon("ios")}
        />
      ) : null}
    </List>
  );
}
