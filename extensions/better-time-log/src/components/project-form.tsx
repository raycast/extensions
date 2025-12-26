import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

interface ProjectFormProps {
  initialProject?: string;
  onSubmit: (project?: string) => Promise<void> | void;
  navigationTitle?: string;
  projects?: string[];
}

export function ProjectForm({
  initialProject,
  onSubmit,
  navigationTitle = "Assign Project",
  projects = [],
}: ProjectFormProps) {
  const { pop } = useNavigation();
  const [customProject, setCustomProject] = useState<string>("");

  const handleSubmit = async (values: { project?: string }) => {
    const project = values.project === "" ? undefined : values.project;
    await onSubmit(project);
    pop();
  };

  // Combine existing projects with custom typed project
  const allProjects = customProject && !projects.includes(customProject) ? [customProject, ...projects] : projects;

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={initialProject ?? ""}
        filtering={false}
        onSearchTextChange={setCustomProject}
      >
        <Form.Dropdown.Item title="No Project" value="" />
        {allProjects.map((p) => (
          <Form.Dropdown.Item key={p} title={p} value={p} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
