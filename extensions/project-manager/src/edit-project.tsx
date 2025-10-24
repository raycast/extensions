import { Action, ActionPanel, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, updateProject, Project, EditorType } from "./utils/storage";

export default function EditProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [name, setName] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [terminal, setTerminal] = useState<"ghostty" | "iterm" | "terminal">("ghostty");
  const [editor, setEditor] = useState<EditorType>("cursor");
  const [claudeCodeCommand, setClaudeCodeCommand] = useState("cc");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project) {
        setName(project.name);
        setPaths([project.path]);
        setWorkspaceFiles(project.workspaceFile ? [project.workspaceFile] : []);
        setTerminal(project.terminal);
        setEditor(project.editor);
        setClaudeCodeCommand(project.claudeCodeCommand || "cc");
      }
    }
  }, [selectedProjectId, projects]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    const path = paths[0];
    const workspaceFile = workspaceFiles[0];

    if (!name || !path || !selectedProjectId || !claudeCodeCommand) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    try {
      await updateProject(selectedProjectId, { name, path, terminal, editor, workspaceFile, claudeCodeCommand });
      await showToast({
        style: Toast.Style.Success,
        title: "Project updated",
        message: `${name} has been updated successfully`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (projects.length === 0 && !isLoading) {
    return (
      <Form>
        <Form.Description text="No projects to edit. Add a project first using 'Add Project'." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Project" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectSelect"
        title="Select Project"
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="name" title="Project Name" placeholder="My Awesome Project" value={name} onChange={setName} />
      <Form.FilePicker
        id="path"
        title="Project Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={paths}
        onChange={setPaths}
      />
      <Form.FilePicker
        id="workspaceFile"
        title="Workspace File (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        value={workspaceFiles}
        onChange={setWorkspaceFiles}
      />
      <Form.Description text="Select a .workspace file to open it directly in your editor instead of the folder" />
      <Form.Dropdown id="editor" title="Code Editor" value={editor} onChange={(v) => setEditor(v as EditorType)}>
        <Form.Dropdown.Item value="cursor" title="Cursor" />
        <Form.Dropdown.Item value="vscode" title="VS Code" />
        <Form.Dropdown.Item value="zed" title="Zed" />
        <Form.Dropdown.Item value="webstorm" title="WebStorm" />
        <Form.Dropdown.Item value="sublime" title="Sublime Text" />
      </Form.Dropdown>
      <Form.Dropdown
        id="terminal"
        title="Terminal"
        value={terminal}
        onChange={(v) => setTerminal(v as "ghostty" | "iterm" | "terminal")}
      >
        <Form.Dropdown.Item value="ghostty" title="Ghostty" />
        <Form.Dropdown.Item value="iterm" title="iTerm" />
        <Form.Dropdown.Item value="terminal" title="Terminal" />
      </Form.Dropdown>
      <Form.TextField
        id="claudeCodeCommand"
        title="Claude Code Command"
        placeholder="cc"
        value={claudeCodeCommand}
        onChange={setClaudeCodeCommand}
        info="The command to launch Claude Code in terminal (e.g., 'cc', 'claude code', 'claude-code')"
      />
    </Form>
  );
}
