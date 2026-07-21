import { Form, Icon } from "@raycast/api";
import type { Project, Tag } from "../api/types";
import { NEW_PROJECT_VALUE } from "../lib/form";

// Raycast dropdowns aren't creatable, so "New Project…" reveals an extra
// TextField; same escape hatch for new tags next to the TagPicker.
export function ProjectTagFields(props: {
  projects: Project[];
  tags: Tag[];
  projectValue: string;
  onProjectChange: (value: string) => void;
}) {
  return (
    <>
      <Form.Dropdown id="project" title="Project" value={props.projectValue} onChange={props.onProjectChange}>
        <Form.Dropdown.Item value="" title="No Project" />
        {props.projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
        <Form.Dropdown.Item value={NEW_PROJECT_VALUE} title="New Project…" icon={Icon.Plus} />
      </Form.Dropdown>
      {props.projectValue === NEW_PROJECT_VALUE && (
        <Form.TextField id="newProjectName" title="New Project Name" placeholder="Project name" />
      )}
      <Form.TagPicker id="tagIds" title="Tags">
        {props.tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="newTagNames" title="New Tags" placeholder="Comma-separated tag names" />
    </>
  );
}
