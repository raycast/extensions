import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import path from "path";
import { createWorkspace, saveWorkspace, Workspace } from "./utils/workspaces";
import { getRecentProjects, Project } from "./utils/projects";

interface CreateWorkspaceProps {
  workspace?: Workspace;
  onSave?: () => void;
}

export default function CreateWorkspace({
  workspace,
  onSave,
}: CreateWorkspaceProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(workspace?.name || "");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    workspace?.projects || [],
  );
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customPaths, setCustomPaths] = useState<string[]>([]);

  const preferences = getPreferenceValues<Preferences.CreateWorkspace>();

  useEffect(() => {
    const loadProjects = async () => {
      const projectPaths = preferences.projectPaths
        .split(",")
        .map((p) => p.trim())
        .map((p) => p.replace(/^~/, homedir()))
        .filter((p) => p.length > 0);

      const maxDepth = parseInt(preferences.maxDepth, 10) || 2;
      const projects = await getRecentProjects(
        projectPaths,
        maxDepth,
        preferences.useShellHistory,
      );
      setAvailableProjects(projects);
      setIsLoading(false);
    };

    loadProjects();
  }, []);

  // Merge custom paths into selected projects when they change
  useEffect(() => {
    if (customPaths.length > 0) {
      const newPaths = customPaths
        .map((p) => p.replace(homedir(), "~"))
        .filter((p) => !selectedProjects.includes(p));

      if (newPaths.length > 0) {
        setSelectedProjects((prev) => [...prev, ...newPaths]);
      }
    }
  }, [customPaths]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name required",
        message: "Please enter a workspace name",
      });
      return;
    }

    if (selectedProjects.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No projects selected",
        message: "Please select at least one project",
      });
      return;
    }

    try {
      if (workspace) {
        await saveWorkspace({
          ...workspace,
          name: name.trim(),
          projects: selectedProjects,
          updatedAt: Date.now(),
        });
        showToast({
          style: Toast.Style.Success,
          title: "Workspace updated",
        });
      } else {
        await createWorkspace(name.trim(), selectedProjects);
        showToast({
          style: Toast.Style.Success,
          title: "Workspace created",
        });
      }

      onSave?.();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save workspace",
        message: String(error),
      });
    }
  };

  // Get all unique projects for the TagPicker
  const allProjectOptions = [
    ...availableProjects.map((p) => ({
      value: p.path.replace(homedir(), "~"),
      title: p.name,
    })),
    // Include any selected projects not in available list
    ...selectedProjects
      .filter(
        (p) =>
          !availableProjects.some(
            (ap) => ap.path.replace(homedir(), "~") === p,
          ),
      )
      .map((p) => ({
        value: p,
        title: path.basename(p.replace(/^~/, homedir())),
      })),
  ];

  // Deduplicate by value
  const uniqueOptions = allProjectOptions.filter(
    (option, index, self) =>
      index === self.findIndex((o) => o.value === option.value),
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={workspace ? "Update Workspace" : "Create Workspace"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Create Workspace"
        text="Group multiple projects together and open them all as Ghostty tabs with one click."
      />

      <Form.TextField
        id="name"
        title="Workspace Name"
        placeholder="My Workspace"
        value={name}
        onChange={setName}
      />

      <Form.TagPicker
        id="projects"
        title="Projects"
        info="Select from your recent projects"
        value={selectedProjects}
        onChange={setSelectedProjects}
      >
        {uniqueOptions.map((option) => (
          <Form.TagPicker.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={Icon.Folder}
          />
        ))}
      </Form.TagPicker>

      <Form.FilePicker
        id="customPaths"
        title="Add Directories"
        info="Browse to add custom directories (press Enter to open picker)"
        allowMultipleSelection={true}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={customPaths}
        onChange={setCustomPaths}
      />

      {selectedProjects.length > 0 && (
        <Form.Description
          title={`${selectedProjects.length} Selected`}
          text={selectedProjects
            .map((p) => path.basename(p.replace(/^~/, homedir())))
            .join(" → ")}
        />
      )}
    </Form>
  );
}
