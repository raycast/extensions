import { Form } from "@raycast/api";
import type { Project } from "../types.js";

export function ProjectDropdown({ projects }: { projects: Project[] }) {
  return (
    <Form.Dropdown id="projectId" title="List">
      <Form.Dropdown.Item value="" title="Default / Inbox" />
      {projects.map((project) => (
        <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
      ))}
    </Form.Dropdown>
  );
}

export function PriorityDropdown() {
  return (
    <Form.Dropdown id="priority" title="Priority" defaultValue="0">
      <Form.Dropdown.Item value="0" title="None" />
      <Form.Dropdown.Item value="1" title="Low" />
      <Form.Dropdown.Item value="3" title="Medium" />
      <Form.Dropdown.Item value="5" title="High" />
    </Form.Dropdown>
  );
}
