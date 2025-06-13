import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Project } from "../../utils/projectManagement";
import { __ } from "../../i18n";

export interface ProjectFormProps {
  project?: Project; // Optional project for editing
  onSubmit: (values: { name: string; path: string }) => void;
}

/**
 * Form component for adding or editing a project
 */
export function ProjectForm({ project, onSubmit }: ProjectFormProps) {
  const navigation = useNavigation();
  // Handle navigation.pop safely - create a function to go back
  const goBack = () => {
    if ("pop" in navigation) {
      // @ts-expect-error - TypeScript doesn't recognize pop but it may exist at runtime
      navigation.pop();
    } else {
      // Fallback if pop doesn't exist
      console.log("Navigation.pop not available");
    }
  };
  const [name, setName] = useState<string>(project?.name || "");
  const [path, setPath] = useState<string>(project?.path || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();

  /**
   * Validate form inputs and submit if valid
   */
  function validateAndSubmit() {
    let valid = true;
    if (!name || name.trim() === "") {
      setNameError(__("projects.form.nameRequired"));
      valid = false;
    } else {
      setNameError(undefined);
    }
    if (!path || path.trim() === "") {
      setPathError(__("projects.form.pathRequired"));
      valid = false;
    } else {
      setPathError(undefined);
    }
    if (valid) {
      onSubmit({ name, path });
      goBack();
    }
  }

  return (
    <Form
      navigationTitle={project ? __("projects.form.editProject") : __("projects.form.addProject")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={project ? __("common.save") : __("common.add")} onSubmit={validateAndSubmit} />
          <Action
            title={__("projects.form.chooseDirectory")}
            icon="folder-icon.png"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => {
              // Use the Raycast native API for dialog functionality
              // The dialog will be provided by Raycast itself when the checkbox is clicked
              // This is a placeholder action - in a production app, you would handle folder selection here
              // We'll use Raycast's preference UI to handle this instead since Raycast will handle the folder picking dialog

              // Show a simulated dialog for folder selection (for development purposes)
              // Normally this would be handled by the native preferences UI
              const simulatedPath = "/Users/selected/project/path";
              setPath(simulatedPath);

              // In actual Raycast extensions, this button would trigger the native file picker
              // This is handled differently than how we're simulating it here
              // The real file picker is handled through the "action" property in package.json
            }}
          />
          <Action title={__("common.cancel")} shortcut={{ modifiers: ["cmd"], key: "." }} onAction={goBack} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={__("projects.form.name")}
        placeholder={__("projects.form.namePlaceholder")}
        error={nameError}
        value={name}
        onChange={setName}
      />
      <Form.FilePicker
        id="path"
        title={__("projects.form.path")}
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        error={pathError}
        value={path ? [path] : []}
        onChange={(paths: string[]) => setPath(paths[0] || "")}
        info={__("projects.form.filePicker")}
      />
    </Form>
  );
}

export default ProjectForm;
