import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import Project from "./types/project";
import getAllProjects from "./tools/getAllProjects";
import { useState, useEffect } from "react";
import createRelease from "./tools/createRelease";

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
            title="Create Release"
            onSubmit={(values) => {
              createRelease({
                projectID: values.project,
                version: values.version,
                releaseType: values.type,
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
      <Form.TextField id="version" title="Version" />
      <Form.Dropdown id="type" title="Type">
        <Form.Dropdown.Item title="major" value="major" />
        <Form.Dropdown.Item title="minor" value="minor" />
        <Form.Dropdown.Item title="patch" value="patch" />
      </Form.Dropdown>
    </Form>
  );
}
