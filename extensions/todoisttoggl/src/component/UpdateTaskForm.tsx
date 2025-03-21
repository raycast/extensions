import { showToast, Toast, ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Task } from "@doist/todoist-api-typescript";
import { useTags, useProjects } from "@/hooks/toggl";
import { useGetProject, useGetLabels, updateTodoistTask } from "@/hooks/todoist/useTodoist";
import { tagFiltering } from "@/helpers/tagFiltering";

function UpdateTaskForm({ mutate, task }: { mutate: () => void; task: Task }) {
  const [taskTitle, setTaskTitle] = useState(task.content);
  const [taskContent, setTaskContent] = useState(task.description);
  const [priority, setPriority] = useState(task.priority.toString());
  const [dueDate] = useState<string | undefined>(undefined);
  const navigaton = useNavigation();

  const { data: projects } = useGetProject();

  const { data: labels } = useGetLabels();

  const [selectedTags, setSelectedTags] = useState<string[]>(task.labels);

  const { tags: togglTags } = useTags();

  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    projects.find((project) => project.id === task.projectId)?.id,
  );

  const { projects: togglProjects } = useProjects();

  async function handleSubmit() {
    try {
      await updateTodoistTask(task.id, {
        content: taskTitle,
        description: taskContent,
        priority: Number(priority),
        dueString: dueDate || undefined,
        labels: selectedTags,
      });
      showToast({ style: Toast.Style.Success, title: "Update task" });
      mutate();
      navigaton.pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Faild to update task" });
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title="プロジェクト"
        value={selectedProject}
        onChange={setSelectedProject}
        info={"Can`t update project."}
      >
        <Form.Dropdown.Item
          key={selectedProject ?? ""}
          value={selectedProject ?? ""}
          title={projects?.find((project) => project.id === selectedProject)?.name ?? "default workspace"}
        />
      </Form.Dropdown>
      <Form.TextField id="task" title="Title" value={taskTitle} onChange={setTaskTitle} autoFocus />
      <Form.TagPicker id="tags" title="Label(Tag)" value={selectedTags} onChange={setSelectedTags}>
        {togglTags
          ?.filter((tag) => tagFiltering(tag, selectedProject, projects, togglProjects))
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

export default UpdateTaskForm;
