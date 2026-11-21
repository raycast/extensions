import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listProjects, listTags, Project } from "./api";

export function useProjectsAndTags() {
  const projects = useCachedPromise(listProjects, [], { initialData: [] });
  const tags = useCachedPromise(listTags, [], { initialData: [] });
  return { projects: projects.data, tags: tags.data, isLoading: projects.isLoading || tags.isLoading };
}

export function ProjectAndTagFields({
  projects,
  tags,
  onProjectChange,
}: {
  projects: Project[];
  tags: { id: string; name: string }[];
  onProjectChange: (project: Project | undefined) => void;
}) {
  return (
    <>
      <Form.Dropdown
        id="project_id"
        title="Project"
        onChange={(id) => onProjectChange(projects.find((project) => project.id === id))}
      >
        <Form.Dropdown.Item value="" title="No project" />
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.client ? `${project.name} · ${project.client.name}` : project.name}
            icon={{ source: Icon.CircleFilled, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tag_ids" title="Tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </>
  );
}
