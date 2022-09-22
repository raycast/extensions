import { ActionPanel, Form, Icon, useNavigation, open, Toast, Action } from "@raycast/api";
import { AddTaskArgs, getColor, Task } from "@doist/todoist-api-typescript";
import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
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

type CreateTaskValues = {
  content: string;
  description: string;
  dueDate: Date;
  priority: string;
  projectId: string;
  sectionId: string;
  labelIds: string[];
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

  const initialValues = {
    content: "",
    description: "",
    dueDate: undefined,
    priority: String(lowestPriority.value),
    projectId: fromProjectId ? String(fromProjectId) : "",
    sectionId: "",
    labelIds: [],
  };

  const { handleSubmit, itemProps, values, focus, reset } = useForm<CreateTaskValues>({
    async onSubmit(values) {
      const body: AddTaskArgs = { content: values.content, description: values.description };

      if (values.dueDate) {
        body.dueDate = getAPIDate(values.dueDate);
      }

      if (values.priority) {
        body.priority = parseInt(values.priority);
      }

      if (values.projectId) {
        body.projectId = parseInt(values.projectId);
      }

      if (values.sectionId) {
        body.sectionId = parseInt(values.sectionId);
      }

      if (values.labelIds && values.labelIds.length > 0) {
        body.labelIds = values.labelIds.map((id) => parseInt(id));
      }

      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
      await toast.show();

      try {
        const { url, id } = await todoist.addTask(body);
        toast.style = Toast.Style.Success;
        toast.title = "Task created";

        toast.primaryAction = {
          title: "Open Task",
          shortcut: { modifiers: ["cmd"], key: "o" },
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

        reset(initialValues);

        focus("content");
      } catch (error) {
        handleError({ error, title: "Unable to create task" });
      }
    },
    initialValues,
    validation: {
      content: FormValidation.Required,
    },
  });

  const projectSections = sections?.filter((section) => String(section.projectId) === values.projectId);

  return (
    <View>
      <Form
        isLoading={isLoadingProjects || isLoadingSections || isLoadingLabels}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.Plus} />
          </ActionPanel>
        }
      >
        <Form.TextField {...itemProps.content} title="Title" placeholder="Buy fruits" />

        <Form.TextArea
          {...itemProps.description}
          title="Description"
          placeholder="Apples, pears, and strawberries (Markdown supported)"
          enableMarkdown
        />

        <Form.Separator />

        <Form.DatePicker {...itemProps.dueDate} title="Due date" type={Form.DatePicker.Type.Date} />

        <Form.Dropdown {...itemProps.priority} title="Priority">
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
          <Form.Dropdown {...itemProps.projectId} title="Project">
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
          <Form.Dropdown {...itemProps.sectionId} title="Section">
            <Form.Dropdown.Item value="" title="No section" />
            {projectSections.map(({ id, name }) => (
              <Form.Dropdown.Item key={id} value={String(id)} title={name} />
            ))}
          </Form.Dropdown>
        ) : null}

        {labels && labels.length > 0 ? (
          <Form.TagPicker {...itemProps.labelIds} title="Labels">
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
