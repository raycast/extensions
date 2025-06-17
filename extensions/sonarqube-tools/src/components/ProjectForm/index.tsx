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
  // Removed unused pathError state

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
      // Path validation - simply check if it exists
      valid = false;
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
        value={path ? [path] : []}
        onChange={(paths: string[]) => setPath(paths[0] || "")}
        info={__("projects.form.filePicker")}
      />
    </Form>
  );
}

export default ProjectForm;
