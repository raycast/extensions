import { Form, getPreferenceValues, Icon, ActionPanel, Action, showHUD } from "@raycast/api";
import { useState } from "react";
import ToggleClient from "../toggl/client";
import { Project, fetchProjects } from "../toggl/project";
import { createNewTimeEntryForProject } from "../toggl/time-entries";
interface Preferences {
  togglAPIKey: string;
}

export default function NewTimeEntry() {
  const [projects, setProjects] = useState<Project[]>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  const preferences = getPreferenceValues<Preferences>();
  const client = ToggleClient(preferences.togglAPIKey);

  fetchProjects(client).then((projects: Project[]) => {
      setProjects(projects);
  });

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  return (
    <Form
      isLoading={projects === undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Time Entry"
            onSubmit={(values) => {
              const project = projects?.filter((project) => {
                return project.id == values.project;
              });

              if (project?.length) {
                createNewTimeEntryForProject(project[0] ?? "", values.description, client).then((timeEntry) => {
                  showHUD(`✅ ${timeEntry} started`);
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Start New Time Entry"
        text="Give a description on what you are doing and select a project."
      />
      <Form.TextField
        id="description"
        title="Describe what you are doing?"
        placeholder="description your work"
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescriptionError("The field should't be empty!");
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="project" title="Project" defaultValue="">
        <Form.Dropdown.Item value={""} title={"No project"} />
        {projects?.map((project: Project, index: number) => (
          <Form.Dropdown.Item
            key={index}
            value={project.id + ""}
            title={project.name}
            icon={{
              source: Icon.Dot,
              tintColor: {
                light: project.color,
                dark: project.color,
                adjustContrast: true,
              },
            }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
