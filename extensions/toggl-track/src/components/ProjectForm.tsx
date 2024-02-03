import { useState } from "react";
import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import dayjs from "dayjs";
import { Workspace, Project, Client, updateProject, createProject, ProjectOptions } from "../api";
import { withToast, Verb } from "../helpers/withToast";

interface ProjectFormProps {
  project?: Project;
  workspace: Workspace;
  clients: Client[];
  revalidateProjects: () => void;
}

export default function ProjectForm({ workspace, project, clients, revalidateProjects }: ProjectFormProps) {
  const { pop } = useNavigation();

  const [startDate, setStartDate] = useState<Date | null | undefined>(
    project ? new Date(project.start_date) : new Date(),
  );
  const [endDate, setEndDate] = useState<Date | null | undefined>(
    project?.end_date ? new Date(project.end_date) : null,
  );

  const [nameError, setNameError] = useState<string>();
  const [colorError, setColorError] = useState<string>();
  const [startDateError, setStartDateError] = useState<string>();

  function handleSubmit({ name, color, isPrivate, clientIdString, startDate, endDate }: ProjectFormValues) {
    if (!name?.trim()) setNameError("Required!");
    if (!color || hexColorRegex.test(color)) setColorError(undefined);
    if (!startDate) setStartDateError("Required!");
    if (startDate && endDate && startDate > endDate) setStartDateError("Start date needs to be before end date");
    else
      withToast({
        noun: "Project",
        verb: project ? Verb.Edit : Verb.Create,
        message: project?.name,
        action: async () => {
          const options: ProjectOptions = {
            active: project?.active ?? true,
            name,
            color,
            is_private: isPrivate,
            client_id: clientIdString ? parseInt(clientIdString) : undefined,
            start_date: dayjs(startDate).format("YYYY-MM-DD"),
            end_date: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
          };
          if (project) await updateProject(project.workspace_id, project.id, options);
          else await createProject(workspace.id, options);
          revalidateProjects();
          pop();
        },
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={project ? "Edit" : "Create" + " Project"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={project?.name}
        error={nameError}
        onChange={(value) => {
          if (value.trim()) setNameError(undefined);
        }}
        onBlur={(event) => {
          if (!event.target.value?.trim()) setNameError("Required!");
        }}
      />
      <Form.TextField
        id="color"
        title="Color"
        defaultValue={project?.color}
        info="Color must be HEX value (e.g. #FF0000)"
        error={colorError}
        onChange={(value) => {
          if (!value || hexColorRegex.test(value)) setColorError(undefined);
        }}
        onBlur={(event) => {
          if (event.target.value && !hexColorRegex.test(event.target.value)) setColorError("Invalid HEX color!");
        }}
      />
      <Form.Checkbox
        id="isPrivate"
        label="Private"
        defaultValue={project?.is_private ?? workspace.projects_private_by_default}
      />
      <Form.Dropdown id="clientIdString" title="Client" defaultValue={project?.client_id?.toString()}>
        <Form.Dropdown.Item title="None" value="" />
        {clients.map((client) => (
          <Form.Dropdown.Item key={client.id} value={client.id.toString()} title={client.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        type={Form.DatePicker.Type.Date}
        value={startDate}
        error={startDateError}
        onChange={(date) => {
          setStartDate(date);
          if (date && (!endDate || date < endDate)) setStartDateError(undefined);
        }}
        onBlur={(event) => {
          if (!event.target.value) setStartDateError("Required!");
          else if (endDate && event.target.value > endDate) setStartDateError("Start date needs to be before end date");
        }}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        type={Form.DatePicker.Type.Date}
        value={endDate}
        onChange={(date) => {
          setEndDate(date);
          if (startDateError && (!date || (startDate && startDate < date))) setStartDateError(undefined);
        }}
        onBlur={(event) => {
          if (!startDateError && event.target.value && startDate && startDate > event.target.value)
            setStartDateError("Start date needs to be before end date");
        }}
      />
    </Form>
  );
}

interface ProjectFormValues {
  name: string;
  color: string;
  isPrivate: boolean;
  clientIdString: string;
  startDate: Date;
  endDate?: Date;
}

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
