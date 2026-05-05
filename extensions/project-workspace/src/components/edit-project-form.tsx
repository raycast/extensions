import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";

import { ProjectOverride, ProjectRecord } from "../types";

interface EditProjectFormProps {
  project: ProjectRecord;
  onSaved: (patch: ProjectOverride) => Promise<void> | void;
}

interface ProjectFormValues {
  displayName?: string;
  description?: string;
  urls?: string;
  pinned?: boolean;
  ideApp?: string[];
  terminalApp?: string[];
}

export function EditProjectForm({ project, onSaved }: EditProjectFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ProjectFormValues) {
    const urls = parseUrls(values.urls ?? "");
    await onSaved({
      displayName: values.displayName,
      description: values.description,
      urls,
      pinned: values.pinned ?? false,
      ideAppPath: values.ideApp?.[0],
      terminalAppPath: values.terminalApp?.[0],
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Project updated",
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="displayName" title="Name" defaultValue={project.displayName ?? ""} />
      <Form.TextArea id="description" title="Description" defaultValue={project.description ?? ""} enableMarkdown />
      <Form.TextArea
        id="urls"
        title="URLs"
        defaultValue={project.urls.join("\n")}
        placeholder="https://example.com&#10;https://apps.apple.com/app/..."
        info="One URL per line. These are displayed in the project detail and actions."
      />
      <Form.Separator />
      <Form.Description
        title="Quick Open Overrides"
        text="Optional per-project overrides. Useful when Java projects should open in IntelliJ IDEA, Android projects in Android Studio, or iOS projects in Xcode."
      />
      <Form.FilePicker
        id="ideApp"
        title="IDE Override"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        defaultValue={project.ideAppPath ? [project.ideAppPath] : []}
        info="Optional. Choose a project-specific IDE app. Leave empty to use the global default IDE."
      />
      <Form.FilePicker
        id="terminalApp"
        title="Terminal Override"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        defaultValue={project.terminalAppPath ? [project.terminalAppPath] : []}
        info="Optional. Choose a project-specific terminal app. Leave empty to use the global default terminal."
      />
      <Form.Separator />
      <Form.Checkbox id="pinned" title="Pinned" label="Pin this project" defaultValue={project.pinned} />
      <Form.Description title="Archive" text="Use the project action menu to archive. Archiving also opens cleanup." />
    </Form>
  );
}

function parseUrls(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}
