import { useState } from "react";
import { ActionPanel, Form, Icon, render, useNavigation } from "@raycast/api";
import { Project as TProject } from "./types";
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
}

function Create() {
  const { push } = useNavigation();
  const { data } = useFetch<TProject[]>("/projects");

  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<string>();
  const [projectId, setProjectId] = useState<string>();

  const projects = data || [];

  function clear() {
    setContent("");
    setDescription("");
    setDueDate(undefined);
    setPriority(String(priorities[0].value));

    if (projects) {
      setProjectId(String(projects[0].id));
    }
  }

  async function submitAndGoToProject() {
    await submit();

    if (projectId) {
      push(<Project projectId={parseInt(projectId)} />);
    }
  }

  async function submit() {
    try {
      const body: FormattedPayload = { content, description };

      if (dueDate) {
        body.due_date = getAPIDate(dueDate);
      }

      if (priority) {
        body.priority = parseInt(priority as string);
      }

      if (projectId) {
        body.project_id = parseInt(projectId as string);
      }

      await createTask(body);
      clear();
    } catch {
      // fail silently
    }
  }

  return (
    <Form
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

      {projects ? (
        <Form.Dropdown id="project_id" title="Project" value={projectId} onChange={setProjectId}>
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

render(<Create />);
