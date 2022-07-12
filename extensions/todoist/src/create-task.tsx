import { useState, useRef } from "react";
import { ActionPanel, Form, Icon, showToast, useNavigation, open, Toast, Action } from "@raycast/api";
import { AddTaskArgs } from "@doist/todoist-api-typescript";
import useSWR, { mutate } from "swr";
import { handleError, todoist } from "./api";
import { priorities } from "./constants";
import { getAPIDate } from "./helpers";
import { SWRKeys } from "./types";
import TaskDetail from "./components/TaskDetail";

export default function CreateTask({ fromProjectId }: { fromProjectId?: number }) {
  const { push } = useNavigation();
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());
  const { data: sections, error: getSectionsError } = useSWR(SWRKeys.sections, () => todoist.getSections());
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get projects" });
  }

  if (getSectionsError) {
    handleError({ error: getSectionsError, title: "Unable to get sections" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  const isLoading = !projects || !labels;

  const lowestPriority = priorities[priorities.length - 1];

  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<string>(String(lowestPriority.value));
  const [projectId, setProjectId] = useState<string>(fromProjectId ? String(fromProjectId) : "");
  const [sectionId, setSectionId] = useState<string>();
  const [labelIds, setLabelIds] = useState<string[]>();

  const titleField = useRef<Form.TextField>(null);

  function clear() {
    setContent("");
    setDescription("");
    setDueDate(undefined);
    setPriority(String(lowestPriority.value));

    if (projects) {
      setProjectId(String(projects[0].id));
    }

    if (labelIds) {
      setLabelIds([]);
    }
  }

  async function submit() {
    const body: AddTaskArgs = { content, description };

    if (!body.content) {
      await showToast({ style: Toast.Style.Failure, title: "The title is required" });
      return;
    }

    if (dueDate) {
      body.dueDate = getAPIDate(dueDate);
    }

    if (priority) {
      body.priority = parseInt(priority);
    }

    if (projectId) {
      body.projectId = parseInt(projectId);
    }

    if (sectionId) {
      body.sectionId = parseInt(sectionId);
    }

    if (labelIds && labelIds.length > 0) {
      body.labelIds = labelIds.map((id) => parseInt(id));
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
    await toast.show();

    try {
      const { url, id } = await todoist.addTask(body);
      toast.style = Toast.Style.Success;
      toast.title = "Task created";

      toast.primaryAction = {
        title: "Open Task",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => push(<TaskDetail taskId={id} />),
      };

      toast.secondaryAction = {
        title: "Open in Browser",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => open(url),
      };

      if (fromProjectId) {
        mutate(SWRKeys.tasks);
      }

      clear();
      titleField.current?.focus();
    } catch (error) {
      handleError({ error, title: "Unable to create task" });
    }
  }

  const projectSections = sections?.filter((section) => String(section.projectId) === projectId);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={submit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="content"
        title="Title"
        placeholder="Buy fruits"
        value={content}
        onChange={setContent}
        ref={titleField}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Apples, pears, and **strawberries**"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.DatePicker
        id="due_date"
        title="Due date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        {priorities.map(({ value, name, color, icon }) => (
          <Form.Dropdown.Item
            value={String(value)}
            title={name}
            key={value}
            icon={{ source: icon ? icon : Icon.Dot, tintColor: color }}
          />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown id="project_id" title="Project" value={projectId} onChange={setProjectId}>
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}

      {projectSections && projectSections.length > 0 ? (
        <Form.Dropdown id="section_id" title="Section" value={sectionId} onChange={setSectionId}>
          <Form.Dropdown.Item value="" title="No section" />
          {projectSections.map(({ id, name }) => (
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
