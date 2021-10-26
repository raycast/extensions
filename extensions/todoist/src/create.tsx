import { ActionPanel, Form, FormValue, render, SubmitFormAction } from "@raycast/api";
import { Project } from "./types";
import { createTask, useFetch } from "./api";
import { priorities } from "./constants";
import { getAPIDate } from "./utils";

function Create() {
  const { data } = useFetch<Project[]>("/projects");

  const projects = data || [];

  async function submit(values: Record<string, FormValue>) {
    const body = { ...values };

    if (values.due_date) {
      const date = new Date(values.due_date as string);
      body.due_date = getAPIDate(date);
    }

    if (values.priority) {
      body.priority = parseInt(values.priority as string);
    }

    if (values.project_id) {
      body.project_id = parseInt(values.project_id as string);
    }

    await createTask(body);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="Title" placeholder="Buy fruits" />
      <Form.TextArea id="description" title="Description" placeholder="Apples, pears, and **strawberries**" />
      <Form.DatePicker id="due_date" title="Due date" />
      <Form.Dropdown id="priority" title="Priority">
        {priorities.map(({ value, name }) => (
          <Form.Dropdown.Item value={String(value)} title={name} key={value} />
        ))}
      </Form.Dropdown>
      {projects ? (
        <Form.Dropdown id="project_id" title="Project">
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

render(<Create />);
