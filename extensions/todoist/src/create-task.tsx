import { useState, useRef } from "react";
import { ActionPanel, Form, Icon, showToast, useNavigation, open, Toast, Action } from "@raycast/api";
import { AddTaskArgs, getColor, Task } from "@doist/todoist-api-typescript";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { handleError, todoist } from "./api";
import { priorities } from "./constants";
import { getAPIDate } from "./helpers/dates";
import { isTodoistInstalled } from "./helpers/isTodoistInstalled";
import TaskDetail from "./components/TaskDetail";
import View from "./components/View";

type CreateTaskProps = {
  fromProjectId?: number;
  mutateTasks?: MutatePromise<Task[] | undefined>;
};

export default function CreateTask({ fromProjectId, mutateTasks }: CreateTaskProps) {
  const { push, pop } = useNavigation();

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: getProjectsError,
  } = useCachedPromise(() => todoist.getProjects());
  const {
    data: sections,
    isLoading: isLoadingSections,
    error: getSectionsError,
  } = useCachedPromise(() => todoist.getSections());
  const {
    data: labels,
    isLoading: isLoadingLabels,
    error: getLabelsError,
  } = useCachedPromise(() => todoist.getLabels());

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get projects" });
  }

  if (getSectionsError) {
    handleError({ error: getSectionsError, title: "Unable to get sections" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

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
        title: `Open Task ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: async () => {
          open(isTodoistInstalled ? `todoist://task?id=${id}` : url);
        },
      };

      if (fromProjectId && mutateTasks) {
        mutateTasks();
        pop();
      }

      clear();
      titleField.current?.focus();
    } catch (error) {
      handleError({ error, title: "Unable to create task" });
    }
  }

  const projectSections = sections?.filter((section) => String(section.projectId) === projectId);

  return (
    <View>
      <Form
        isLoading={isLoadingProjects || isLoadingSections || isLoadingLabels}
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
            {projects.map(({ id, name, color, inboxProject }) => (
              <Form.Dropdown.Item
                key={id}
                value={String(id)}
                icon={inboxProject ? Icon.Envelope : { source: Icon.List, tintColor: getColor(color).value }}
                title={name}
              />
            ))}
          </Form.Dropdown>
        ) : null}

        {projectSections && projectSections.length > 0 ? (
          <Form.Dropdown id="section_id" title="Section" value={sectionId} onChange={setSectionId}>
            <Form.Dropdown.Item value="" title="No section" />
            {projectSections.map(({ id, name }) => (
              <Form.Dropdown.Item key={id} value={String(id)} title={name} />
            ))}
          </Form.Dropdown>
        ) : null}

        {labels && labels.length > 0 ? (
          <Form.TagPicker id="label_ids" title="Labels" value={labelIds} onChange={setLabelIds}>
            {labels.map(({ id, name, color }) => (
              <Form.TagPicker.Item
                key={id}
                value={String(id)}
                title={name}
                icon={{ source: Icon.Tag, tintColor: getColor(color).value }}
              />
            ))}
          </Form.TagPicker>
        ) : null}
      </Form>
    </View>
  );
}
