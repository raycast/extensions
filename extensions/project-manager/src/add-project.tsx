import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addProject, EditorType } from "./utils/storage";

export default function AddProject() {
  const [name, setName] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [terminal, setTerminal] = useState<"ghostty" | "iterm" | "terminal">("ghostty");
  const [editor, setEditor] = useState<EditorType>("cursor");
  const [claudeCodeCommand, setClaudeCodeCommand] = useState("cc");

  async function handleSubmit() {
    const path = paths[0];
    const workspaceFile = workspaceFiles[0];

    if (!name || !path || !claudeCodeCommand) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    try {
      await addProject({ name, path, terminal, editor, workspaceFile, claudeCodeCommand });
      await showToast({
        style: Toast.Style.Success,
        title: "Project added",
        message: `${name} has been added successfully`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
