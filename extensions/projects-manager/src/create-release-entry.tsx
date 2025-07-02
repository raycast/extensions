import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import Project from "./types/project";
import getAllProjects from "./tools/getAllProjects";
import { useState, useEffect } from "react";
import createReleaseEntry from "./tools/createReleaseEntry";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    getAllProjects().then(setProjects);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Release Entry"
            onSubmit={(values) => {
              createReleaseEntry({
                projectID: values.project,
                description: values.description,
                entryType: values.entryType,
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project">
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.categoryName + "-" + project.name}
            title={project.name}
            value={project.name}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="description" title="Description" />
      <Form.Dropdown id="entryType" title="Entry Type">
        <Form.Dropdown.Item title="addition" value="Addition" />
        <Form.Dropdown.Item title="improvement" value="Improvement" />
        <Form.Dropdown.Item title="bug-fix" value="Bug Fix" />
      </Form.Dropdown>
    </Form>
  );
}
