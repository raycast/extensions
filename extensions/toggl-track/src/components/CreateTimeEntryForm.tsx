import {
  useNavigation,
  Form,
  ActionPanel,
  SubmitFormAction,
  Icon,
  showToast,
  ToastStyle,
  clearSearchBar,
} from "@raycast/api";
import toggl from "../toggl";
import { storage } from "../storage";
import { Project } from "../toggl/types";
import { useAppContext } from "../context";
import { useMemo, useState } from "react";

function CreateTimeEntryForm({ project, description }: { project?: Project; description?: string }) {
  const navigation = useNavigation();
  const { projects, tags, isLoading, projectGroups } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(project);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [billable, setBillable] = useState<boolean>(false);

  async function handleSubmit(values: { description: string }) {
    try {
      await toggl.createTimeEntry({
        projectId: selectedProject?.id,
        description: values.description,
        tags: selectedTags,
        billable,
      });
      await showToast(ToastStyle.Animated, "Starting time entry...");
      await storage.runningTimeEntry.refresh();
      await showToast(ToastStyle.Success, "Started time entry");
      navigation.pop();
      await clearSearchBar();
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to start time entry");
    }
  }

  const projectTags = useMemo(() => {
    return tags.filter((tag) => tag.wid === selectedProject?.wid);
  }, [tags, selectedProject]);

  const onProjectChange = (projectId: string) => {
    const project = projects.find((project) => project.id === parseInt(projectId));
    if (project) {
      setSelectedProject(project);
    }
  };

  const onTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" defaultValue={description} />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={selectedProject?.id.toString()}
        onChange={onProjectChange}
      >
        {projectGroups.map((group) => (
          <Form.Dropdown.Section
            key={group.key}
            title={`${group.workspace.name} ${group.client?.name ? `(${group.client?.name})` : ""}`}
          >
            {group.projects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={project.id.toString()}
                title={project.name}
                icon={{ source: Icon.Circle, tintColor: project.hex_color }}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" onChange={onTagsChange}>
        {projectTags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
        ))}
      </Form.TagPicker>
      {selectedProject?.billable && (
        <Form.Checkbox id="billable" label="" title="Billable" value={billable} onChange={setBillable} />
      )}
    </Form>
  );
}

export default CreateTimeEntryForm;
