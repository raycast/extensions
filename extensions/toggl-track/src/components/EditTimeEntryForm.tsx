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
import { Project, TimeEntry } from "../toggl/types";
import { useAppContext } from "../context";
import { useMemo, useState } from "react";

function EditTimeEntryForm({ project, entry }: { project?: Project; entry: TimeEntry }) {
  const navigation = useNavigation();
  const { projects, tags, isLoading, projectGroups } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(project);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function handleSubmit(values: { description: string; tags: string[]; start: string; end?: string}) {
    try {
      await toggl.editTimeEntry({
        id: entry.id,
        projectId: selectedProject?.id,
        description: values.description,
        tags: values.tags,
        start: values.start,
        duration: (values.end ? Math.trunc((new Date(values.end).getTime() - new Date(values.start).getTime()) / 1000) : -1)
      });
      await showToast(ToastStyle.Animated, "Updating time entry...");
      "stop" in entry ? await storage.timeEntries.refresh() : await storage.runningTimeEntry.refresh();;
      await showToast(ToastStyle.Success, "Updated time entry");
      navigation.pop();
      await clearSearchBar();
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to update time entry");
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

  return(
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Update Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" defaultValue={entry.description} />
      <Form.DatePicker id="start" title="Start Time" defaultValue={new Date(entry.start).toISOString().replace("T", " ").substring(0, 16) + " UTC" } />
      {"stop" in entry ?
        <Form.DatePicker id="end" title="End Time" defaultValue={ new Date(entry.stop).toISOString().replace("T", " ").substring(0, 16) + " UTC" } /> : undefined
      }
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={entry.pid.toString()}
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
      <Form.TagPicker id="tags" title="Tags" onChange={onTagsChange} defaultValue={entry.tags}>
        {projectTags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default EditTimeEntryForm;
