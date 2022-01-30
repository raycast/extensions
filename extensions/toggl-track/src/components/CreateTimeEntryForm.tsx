import {
  useNavigation,
  Form,
  ActionPanel,
  SubmitFormAction,
  Icon,
  showToast,
  ToastStyle,
  clearSearchBar,
  getPreferenceValues,
} from "@raycast/api";
import toggl from "../toggl";
import { storage } from "../storage";
import { Project } from "../toggl/types";
import { useAppContext } from "../context";
import { useMemo, useState } from "react";

interface Preferences {
  defaultProject: string;
}

const preferences: Preferences = getPreferenceValues();

function CreateTimeEntryForm({ project, description }: { project?: Project; description?: string }) {
  const navigation = useNavigation();
  const { projects, tags, isLoading, projectGroups } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(project);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function handleSubmit(values: { description: string; start: string; end: string; }) {
    try {
      await toggl.createTimeEntry({
        projectId: selectedProject?.id,
        description: values.description,
        tags: selectedTags,
        start: values.start,
        duration: Math.trunc((new Date(values.end).getTime() - new Date(values.start).getTime()) / 1000)
      });
      await showToast(ToastStyle.Animated, "Creating time entry...");
      await storage.timeEntries.refresh();
      await showToast(ToastStyle.Success, "Created time entry");
      navigation.pop();
      await clearSearchBar();
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to create time entry");
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
      <Form.DatePicker id="start" title="Start Time" />
      <Form.DatePicker id="end" title="End Time" />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={selectedProject ? selectedProject.id.toString() : preferences.defaultProject}
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
    </Form>
  );
}

export default CreateTimeEntryForm;
