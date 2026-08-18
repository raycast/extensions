import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { createTask, getProjects, getTags } from "./api";
import type { Project, Tag } from "./types";
import { formatLocalDate } from "./utils";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [fetchedProjects, fetchedTags] = await Promise.all([getProjects(), getTags()]);
        setProjects(fetchedProjects);
        setTags(fetchedTags);
      } catch (e) {
        console.error("Failed to fetch projects/tags:", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOptions();
  }, []);

  async function handleSubmit(values: {
    title: string;
    notes: string;
    projectId: string;
    tagIds: string[];
    dueDay: Date | null;
    timeEstimateHours: string;
  }) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const estimateInput = values.timeEstimateHours.trim();
    const estimateHours = Number(estimateInput);
    if (estimateInput && (!Number.isFinite(estimateHours) || estimateHours <= 0)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Time estimate must be a positive number",
      });
      return;
    }
    const timeEstimate = estimateInput ? estimateHours * 3600000 : undefined;

    const dueDay = values.dueDay ? formatLocalDate(values.dueDay) : undefined;

    try {
      await createTask({
        title: values.title.trim(),
        notes: values.notes.trim() || undefined,
        projectId: values.projectId || undefined,
        tagIds: values.tagIds.length > 0 ? values.tagIds : undefined,
        dueDay,
        timeEstimate,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: values.title,
      });
      popToRoot();
    } catch (e) {
      console.error("Failed to create task:", e);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="What needs to be done?" autoFocus />
      <Form.TextArea id="notes" title="Notes" placeholder="Additional details..." />
      <Form.Dropdown id="projectId" title="Project" defaultValue="">
        <Form.Dropdown.Item title="None (Inbox)" value="" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} title={project.title} value={project.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagIds" title="Tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} title={tag.title} value={tag.id} />
        ))}
      </Form.TagPicker>
      <Form.DatePicker id="dueDay" title="Due Date" />
      <Form.TextField id="timeEstimateHours" title="Time Estimate (hours)" placeholder="e.g. 1.5" />
    </Form>
  );
}
