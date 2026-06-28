import { Action, ActionPanel, Form, Toast, showToast, popToRoot } from "@raycast/api";
import { useMite, fetch_mite } from "./hooks/useMite";
import { projects_schema, services_schema, time_entry_post_schema } from "./validations";
import { parse } from "valibot";

export default function Command() {
  const projects = useMite(`/projects.json`, projects_schema);
  const services = useMite(`/services.json`, services_schema);

  async function handleSubmit(time_entry: unknown) {
    try {
      const body = parse(time_entry_post_schema, { time_entry });
      const res = await fetch_mite("/time_entries.json", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast({ title: "Entry created", style: Toast.Style.Success });

        popToRoot({
          clearSearchBar: false,
        });
        return;
      }
      showToast({
        title: "Error",
        message: "There was an error in the submission",
        style: Toast.Style.Failure,
      });
    } catch (e) {
      showToast({
        title: "Error",
        message: "There was an error in the values of the form",
        style: Toast.Style.Failure,
      });
    }
  }

  const hrs: Array<{ value: string; title: string }> = [];

  for (let minutes = 0; minutes <= 480; minutes += 30) {
    const whole = Math.floor(minutes / 60);
    const half = minutes / 60 === Math.floor(minutes / 60) ? "00" : "30";
    hrs.push({
      value: minutes.toString(),
      title: `${whole.toString().padStart(2, "0")}:${half}`,
    });
  }

  return (
    <Form
      isLoading={projects.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add Today Entry"
        text="Submit your Time Entry: you can pick a project and a service and chose how many time to allocate for this entry. You can add multiple entries."
      />
      <Form.Separator />
      <Form.Dropdown id="minutes" title="Time" storeValue>
        {hrs && hrs.map((hr) => <Form.Dropdown.Item key={hr.value} {...hr} />)}
      </Form.Dropdown>
      <Form.Dropdown id="project_id" title="Projects" isLoading={projects.isLoading} storeValue>
        <Form.Dropdown.Item value={""} title={""} />
        {projects.data &&
          projects.data.map(({ project }) => (
            <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="service_id" title="Services" isLoading={services.isLoading} storeValue>
        <Form.Dropdown.Item value={""} title={""} />
        {services.data &&
          services.data.map(({ service }) => (
            <Form.Dropdown.Item key={service.id} value={service.id.toString()} title={service.name} />
          ))}
      </Form.Dropdown>
      <Form.TextArea id="note" title={"Note"} storeValue />
    </Form>
  );
}
