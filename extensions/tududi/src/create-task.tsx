import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { createTask, fetchProjects, fetchTags } from "./lib/api";
import { isInTodayPlan, parsePriority, TASK_STATUS } from "./lib/constants";

export default function Command() {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [status, setStatus] = useState("0");
  const [note, setNote] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [today, setToday] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useCachedPromise(fetchProjects);
  const { data: tags = [], isLoading: tagsLoading } = useCachedPromise(fetchTags);

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTagObjects = selectedTags
        .map((uid) => tags.find((t) => t.uid === uid))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));

      // Tududi removed the boolean `today` field. Tasks appear in Today's plan when
      // status is planned / in_progress / waiting. Only rewrite statuses that aren't
      // already in the plan (e.g. Not Started, Done) so In Progress / Waiting are kept.
      let resolvedStatus = Number.parseInt(status, 10);
      if (today && !isInTodayPlan(resolvedStatus)) {
        resolvedStatus = TASK_STATUS.PLANNED;
      }

      await createTask({
        name: name.trim(),
        priority: parsePriority(priority),
        ...(dueDate ? { due_date: dueDate.toISOString() } : {}),
        status: resolvedStatus,
        note,
        ...(selectedProject ? { project_id: Number.parseInt(selectedProject, 10) } : {}),
        ...(selectedTagObjects.length > 0 ? { tags: selectedTagObjects.map((t) => ({ name: t.name })) } : {}),
      });

      showToast({ style: Toast.Style.Success, title: "Task created successfully" });
      setName("");
      setPriority("medium");
      setDueDate(null);
      setStatus("0");
      setNote("");
      setSelectedProject("");
      setSelectedTags([]);
      setToday(true);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={projectsLoading || tagsLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Tududi task." />
      <Form.TextField id="name" title="Name" placeholder="Enter task name" value={name} onChange={setName} />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.DatePicker id="dueDate" title="Due Date" value={dueDate} onChange={(date) => setDueDate(date || null)} />
      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus}>
        <Form.Dropdown.Item value="0" title="Not Started" />
        <Form.Dropdown.Item value="1" title="In Progress" />
        <Form.Dropdown.Item value="6" title="Planned" />
        <Form.Dropdown.Item value="4" title="Waiting" />
        <Form.Dropdown.Item value="2" title="Done" />
        <Form.Dropdown.Item value="3" title="Archived" />
        <Form.Dropdown.Item value="5" title="Cancelled" />
      </Form.Dropdown>
      <Form.Dropdown id="project" title="Project" value={selectedProject} onChange={setSelectedProject}>
        <Form.Dropdown.Item value="" title="No Project" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={selectedTags} onChange={setSelectedTags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.uid} value={tag.uid} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="note" title="Note" placeholder="Enter task note" value={note} onChange={setNote} />
      <Form.Checkbox
        id="today"
        label="Add to Today Plan"
        value={today}
        onChange={setToday}
        info="Sets status to Planned so the task appears on Tududi's Today page"
      />
    </Form>
  );
}
