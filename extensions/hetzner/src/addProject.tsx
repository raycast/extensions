import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
} from "@raycast/api";
import React, { useState } from "react";
import { Project } from "./models/project";
import { getAllProjects } from "./actions/project-action";

export default function Command() {
  const [projectNameError, setProjectNameError] = useState<
    string | undefined
  >();
  const [projectIdError, setProjectIdError] = useState<string | undefined>();
  const [accessTokenError, setAccessTokenError] = useState<
    string | undefined
  >();

  function validateRequired(
    value: string,
    setError: React.Dispatch<React.SetStateAction<string | undefined>>,
  ): boolean {
    if (!value) {
      setError("Required");
      return true;
    } else {
      setError(undefined);
      return false;
    }
  }

  async function validateProjectId(value: string): Promise<boolean> {
    if (!value) {
      setProjectIdError("Required");
      return true;
    } else {
      const projects = await getAllProjects();
      const projectIdIsNotUnique = projects.find(
        (project) => project.projectId === value,
      );

      if (projectIdIsNotUnique) {
        setProjectIdError("Project Id must be unique");
        return true;
      }
    }

    setProjectIdError(undefined);
    return false;
  }

  async function createProject(submittedForm: Project) {
    const projectNameIsInvalid = validateRequired(
      submittedForm.name,
      setProjectNameError,
    );
    const projectIdIsInvalid = await validateProjectId(submittedForm.projectId);
    const accessTokenIsInvalid = validateRequired(
      submittedForm.accessToken,
      setAccessTokenError,
    );

    if (projectNameIsInvalid || projectIdIsInvalid || accessTokenIsInvalid) {
      return;
    }

    const projects = await getAllProjects();
    const oneProjectIsSpecifiedAsDefault = projects.some(
      (project) => project.selected,
    );

    submittedForm.selected = !oneProjectIsSpecifiedAsDefault;
    await LocalStorage.setItem(
      `project-${submittedForm.projectId}`,
      JSON.stringify(submittedForm),
    );

    await launchCommand({
      name: "manageProject",
      type: LaunchType.UserInitiated,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: Project) => createProject(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        error={projectNameError}
        onChange={(value) => validateRequired(value, setProjectNameError)}
        onBlur={(event) => {
          validateRequired(event.target.value ?? "", setProjectNameError);
        }}
        title="Project Name"
      />
      <Form.TextField
        id="projectId"
        error={projectIdError}
        title="Project Id"
        onChange={validateProjectId}
        onBlur={async (event) => {
          await validateProjectId(event.target.value ?? "");
        }}
        info="The project id under which your access token was created. You can find the project id in the Hetzner URL."
      />
      <Form.PasswordField
        id="accessToken"
        error={accessTokenError}
        onChange={(value) => validateRequired(value, setAccessTokenError)}
        onBlur={(event) => {
          validateRequired(event.target.value ?? "", setAccessTokenError);
        }}
        title="Access Token"
      />
      <Form.Dropdown
        id="permission"
        title="Permission"
        defaultValue="readWrite"
        info="Specify which permission your access token has. This helps us to display actions based on your rights."
      >
        <Form.Dropdown.Item value="read" title="Read" icon={Icon.Glasses} />
        <Form.Dropdown.Item
          value="readWrite"
          title="Read/Write"
          icon={Icon.Pencil}
        />
      </Form.Dropdown>
    </Form>
  );
}
