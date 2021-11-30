import { useState } from "react";
import { ActionPanel, Form, Icon, render, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { Project as TProject, Label } from "./types";
import { createTask, useFetch } from "./api";
import { priorities } from "./constants";
import { getAPIDate } from "./utils";
import Project from "./components/Project";

interface FormattedPayload {
  content: string;
  description: string;
  due_date?: string;
  priority?: number;
  project_id?: number;
  label_ids?: number[];
}

function Create() {
  const { push } = useNavigation();
  const { data: projects, isLoading: isLoadingProjects } = useFetch<TProject[]>("/projects");
  const { data: labels, isLoading: isLoadingLabels } = useFetch<Label[]>("/labels");
  const isLoading = isLoadingLabels || isLoadingProjects;

  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<string>();
  const [projectId, setProjectId] = useState<string>();
  const [labelIds, setLabelIds] = useState<string[]>();

  function clear() {
    setContent("");
    setDescription("");
    setDueDate(undefined);
    setPriority(String(priorities[0].value));

    if (projects) {
      setProjectId(String(projects[0].id));
    }

    if (labelIds) {
      setLabelIds([]);
    }
  }

  async function submitAndGoToProject() {
    await submit();

    if (projectId) {
      push(<Project projectId={parseInt(projectId)} />);
    }
  }

  async function submit() {
    const body: FormattedPayload = { content, description };

    if (!body.content) {
      await showToast(ToastStyle.Failure, "The title is required");
      return;
    }

    if (dueDate) {
      body.due_date = getAPIDate(dueDate);
    }

    if (priority) {
      body.priority = parseInt(priority);
    }

    if (projectId) {
      body.project_id = parseInt(projectId);
    }

    if (labelIds && labelIds.length > 0) {
      body.label_ids = labelIds.map((id) => parseInt(id));
    }

    await createTask(body);
    clear();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Create task" onAction={submit} icon={Icon.Plus} />
          <ActionPanel.Item
            title="Create task and go to project"
            onAction={submitAndGoToProject}
            icon={Icon.ArrowRight}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="Title" placeholder="Buy fruits" value={content} onChange={setContent} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Apples, pears, and **strawberries**"
        value={description}
        onChange={setDescription}
      />

      <Form.DatePicker id="due_date" title="Due date" value={dueDate} onChange={setDueDate} />

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        {priorities.map(({ value, name }) => (
          <Form.Dropdown.Item value={String(value)} title={name} key={value} />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown id="project_id" title="Project" value={projectId} onChange={setProjectId}>
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}

      {labels && labels.length > 0 ? (
        <Form.TagPicker id="label_ids" title="Labels" value={labelIds} onChange={setLabelIds}>
          {labels.map(({ id, name }) => (
            <Form.TagPicker.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.TagPicker>
      ) : null}
    </Form>
  );
}

render(<Create />);
