import { useState } from "react";

import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";

import type { Project } from "@/api/types";
import { useDenoApi } from "@/hooks/useDenoApi";
import { showActionToast, showFailureToastWithTimeout } from "@/utils/toast";

function validateName(value: string): null | string {
  // name can only be lowercase letters, numbers, and dashes
  if (!/^[a-z0-9-]+$/.test(value)) {
    return "Project name must only contain lowercase letters, numbers, and dashes";
  }
  // name cannot start or end with a dash
  if (/^-.*$/.test(value)) {
    return "Project name cannot start with a dash";
  }
  if (/.*-$/.test(value)) {
    return "Project name cannot end with a dash";
  }
  return null;
}

const ProjectNameChange = ({ project, refresh }: { project: Project; refresh: () => void }) => {
  const { updateProjectName } = useDenoApi();
  const { pop } = useNavigation();

  const [renameError, setRenameError] = useState<string | undefined>();

  const dropNameError = () => {
    if (renameError && renameError.length > 0) {
      setRenameError(undefined);
    }
  };

  return (
    <Form
      navigationTitle={`Rename "${project.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={async (evt) => {
              const formData = evt as unknown as Record<string, string>;
              const newName = formData.projectName;
              if (newName?.length > 0 && newName !== project.name) {
                console.log(`Renaming project ${project.name} to ${newName}`);
                try {
                  const abort = showActionToast({ title: `Updating project name`, cancelable: true });

                  await updateProjectName(project.id, newName, abort.signal);

                  showToast(Toast.Style.Success, `Project name updated to ${newName}`, `Project name updated`);
                  refresh();
                  pop();
                } catch (e) {
                  console.error(`Failed to rename project ${project.name} to ${newName}: ${e}`);
                  setRenameError((e as Error).message);
                  await showFailureToastWithTimeout(
                    "Failed to rename project ${project.name} to ${newName}",
                    e as Error,
                  );
                  return;
                }
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Rename Project"
        text={`Enter a new name for the project, original name is "${project.name}"`}
      />
      <Form.TextField
        id="projectName"
        title="Project Name"
        placeholder="Project Name"
        error={renameError}
        onChange={(value) => {
          if (value && value.length > 0) {
            const error = validateName(value);
            if (error) {
              setRenameError(error);
            } else {
              dropNameError();
            }
          } else {
            setRenameError("Project name cannot be empty");
          }
        }}
        defaultValue={project.name}
      />
    </Form>
  );
};

export default ProjectNameChange;
