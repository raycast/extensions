import { showToast, Toast, ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { createTimeEntry } from "@/api";
import { useState } from "react";
import { Tag } from "@/api";
import { useTags, useProjects, useMe } from "@/hooks/toggl";
import { useGetProject, useGetLabels, useCreateTask, useAddTimerId } from "@/hooks/todoist/useTodoist";
import { tagFiltering } from "@/helpers/tagFiltering";

function CreateTaskForm({ mutate, refreshTimer }: { mutate: () => void; refreshTimer: () => void }) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [priority, setPriority] = useState("1");
  const [dueDate] = useState<string | undefined>(undefined);
  const navigation = useNavigation();

  const { data: projects, isLoading: isLoadingProjects } = useGetProject();
  const { data: labels } = useGetLabels();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { projects: togglProjects } = useProjects();
  const { tags: togglTags } = useTags();
  const { me: togglMe } = useMe();
  const [selectedProject, setSelectedProject] = useCachedState("defaultWorkspace", "");

  async function handleSubmit(trackToggl: boolean = false) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task..." });
      const responseTask = await useCreateTask({
        content: taskTitle,
        description: taskContent,
        projectId: selectedProject,
        priority: Number(priority),
        dueString: dueDate || undefined,
        labels: selectedTags,
      });
      if (trackToggl) {
        showToast({ style: Toast.Style.Animated, title: "Starting track..." });
        const currentTodoistProject = projects?.find((project) => project.id === selectedProject);
        const togglProjectId =
          currentTodoistProject?.name.indexOf("@") !== -1
            ? currentTodoistProject?.name.slice(currentTodoistProject?.name.indexOf("@") + 1)
            : null;
        const currentTogglProject = togglProjects.find((project) => project.id === Number(togglProjectId));

        const now = new Date();
        const workspaceId = currentTogglProject ? currentTogglProject.workspace_id : togglMe.default_workspace_id;
        const togglTimerData = {
          workspaceId: workspaceId,
          description: taskTitle,
          start: now.toISOString(),
          created_with: "raycast-todoist-toggl",
          projectId: currentTogglProject ? currentTogglProject.id : undefined,
          duration: -1,
          tags: selectedTags,
        };
        try {
          const timeEntryData = await createTimeEntry(togglTimerData);
          await useAddTimerId({ taskId: responseTask.id, content: timeEntryData.id.toString() });
          showToast({ style: Toast.Style.Success, title: `${taskTitle} is tracking in Toggl` });
          refreshTimer();
        } catch (error) {
          showToast({ style: Toast.Style.Failure, title: "Failed to track in Toggl" });
        }
      }
      showToast({ style: Toast.Style.Success, title: "Create task" });
      mutate();
      navigation.pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create task" });
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={() => handleSubmit()} />
          <Action.SubmitForm title="Create Start" onSubmit={() => handleSubmit(true)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProject}
        onChange={setSelectedProject}
        isLoading={isLoadingProjects}
      >
        {projects?.map((project) => <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />)}
      </Form.Dropdown>
      <Form.TextField id="task" title="Title" value={taskTitle} onChange={setTaskTitle} autoFocus />
      <Form.TagPicker id="tags" title="Label(tag)" value={selectedTags} onChange={setSelectedTags}>
        {togglTags
          ?.filter((tag: Tag) => tagFiltering(tag, selectedProject, projects, togglProjects))
          .map((tag: { id: number; name: string }) => (
            <Form.TagPicker.Item key={tag.id} value={tag.name} icon="track_command.png" title={tag.name} />
          ))}
        {labels?.map((label) => (
          <Form.TagPicker.Item key={label.id} value={label.name} icon="task_command.png" title={label.name} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="task_content" title="Description" value={taskContent} onChange={setTaskContent} />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        <Form.Dropdown.Item value="1" title="1 (Default)" />
        <Form.Dropdown.Item value="2" title="2" />
        <Form.Dropdown.Item value="3" title="3" />
        <Form.Dropdown.Item value="4" title="4 (Priority)" />
      </Form.Dropdown>
    </Form>
  );
}

export default CreateTaskForm;
