import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { parse } from "valibot";
import { useMite } from "./hooks/useMite";
import { useStorageState } from "./hooks/useStorageState";
import { TimeEntryPost, projects_schema, services_schema, time_entry_post_schema } from "./validations";

export default function Command() {
  const [fast_time_entry, set_fast_time_entry, { loading: ft_loading }] = useStorageState<TimeEntryPost | null>(
    "fast-time-entry",
    null,
  );
  const [secondary_fast_time_entry, set_secondary_fast_time_entry, { loading: sft_loading }] =
    useStorageState<TimeEntryPost | null>("secondary-fast-time-entry", null);

  const [kind, set_kind] = useState<"primary" | "secondary">("primary");

  const [minutes, set_minutes] = useState<string | undefined>(fast_time_entry?.time_entry.minutes.toString() ?? "");
  const [project, set_project] = useState<string | undefined>(fast_time_entry?.time_entry.project_id ?? "");
  const [service, set_service] = useState<string | undefined>(fast_time_entry?.time_entry.service_id ?? "");

  useEffect(() => {
    if (!ft_loading && !sft_loading) {
      set_minutes(fast_time_entry?.time_entry.minutes.toString() ?? "");
      set_project(fast_time_entry?.time_entry.project_id ?? "");
      set_service(fast_time_entry?.time_entry.service_id ?? "");
    }
  }, [ft_loading, sft_loading]);

  const projects = useMite(`/projects.json`, projects_schema);
  const services = useMite(`/services.json`, services_schema);

  const hrs: Array<{ value: string; title: string }> = [];

  for (let minutes = 0; minutes <= 480; minutes += 30) {
    const whole = Math.floor(minutes / 60);
    const half = minutes / 60 === Math.floor(minutes / 60) ? "00" : "30";
    hrs.push({
      value: minutes.toString(),
      title: `${whole.toString().padStart(2, "0")}:${half}`,
    });
  }

  async function handleSubmit(time_entry: unknown) {
    try {
      const body = parse(time_entry_post_schema, { time_entry });
      const set_time_entry = kind === "primary" ? set_fast_time_entry : set_secondary_fast_time_entry;
      const subtitle_project = projects.data?.find((proj) => proj.project.id.toString() === project);
      const subtitle_service = services.data?.find((serv) => serv.service.id.toString() === service);
      const subtitle_minutes = hrs.find((hr) => hr.value.toString() === minutes);
      const subtitle = `${subtitle_project?.project?.name ?? ""} • ${subtitle_service?.service?.name ?? ""} • ${subtitle_minutes?.title ?? ""}`;
      set_time_entry({ time_entry: { ...body.time_entry, subtitle } });
      showToast({
        title: "Success",
        message: `${kind === "secondary" ? "Secondary " : ""}Fast Time entry successfully saved`,
        style: Toast.Style.Success,
      });
      popToRoot({
        clearSearchBar: false,
      });
    } catch (e) {
      console.log(e);
      showToast({
        title: "Error",
        message: "There was an error in the values of the form",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      isLoading={projects.isLoading || ft_loading || sft_loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Setup Fast Time Entry"
        text="This command can setup the two fast entry. Once you pick the type (Primary or Secondary) you can pick a project and a service and chose how many time to allocate for this entry. After saving you can run the respectively the commands 'Mite Fast Entry' or 'Mite Secondary Fast Entry' to submit the saved Fast entry without selecting anything."
      />
      <Form.Separator />
      <Form.Dropdown
        onChange={(value) => {
          set_kind(value as "primary" | "secondary");
          const time_entry = value === "primary" ? fast_time_entry : secondary_fast_time_entry;
          set_minutes(time_entry?.time_entry.minutes.toString());
          set_project(time_entry?.time_entry.project_id);
          set_service(time_entry?.time_entry.service_id);
        }}
        id="kind"
        title="Type"
        storeValue
        value={kind}
      >
        <Form.Dropdown.Item value="primary" title="Primary" />
        <Form.Dropdown.Item value="secondary" title="Secondary" />
      </Form.Dropdown>
      <Form.Dropdown
        id="minutes"
        title="Time"
        storeValue
        onChange={(new_minutes) => {
          set_minutes(new_minutes);
        }}
        value={minutes}
      >
        {hrs && hrs.map((hr) => <Form.Dropdown.Item key={hr.value} {...hr} />)}
      </Form.Dropdown>
      <Form.Dropdown
        id="project_id"
        title="Projects"
        onChange={(new_project) => {
          set_project(new_project);
        }}
        value={project}
        isLoading={projects.isLoading}
        storeValue
      >
        <Form.Dropdown.Item value={""} title={""} />
        {projects.data &&
          projects.data.map(({ project }) => (
            <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="service_id"
        onChange={(new_service) => {
          set_service(new_service);
        }}
        value={service}
        title="Services"
        isLoading={services.isLoading}
        storeValue
      >
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
