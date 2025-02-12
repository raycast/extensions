import { ActionPanel, Form, Icon, useNavigation, open, Toast, Action, Color } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { addComment, addTask, AddTaskArgs, handleError, uploadFile } from "./api";
import RefreshAction from "./components/RefreshAction";
import TaskDetail from "./components/TaskDetail";
import View from "./components/View";
import { getCollaboratorIcon, getProjectCollaborators } from "./helpers/collaborators";
import { getColorByKey } from "./helpers/colors";
import { getAPIDate } from "./helpers/dates";
import { isTodoistInstalled } from "./helpers/isTodoistInstalled";
import { priorities } from "./helpers/priorities";
import { getPriorityIcon } from "./helpers/priorities";
import { getProjectIcon } from "./helpers/projects";
import { getTaskAppUrl, getTaskUrl } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";

type CreateTaskValues = {
  content: string;
  description: string;
  date: Date | null;
  deadline: Date | null;
  duration: string;
  priority: string;
  projectId: string;
  sectionId: string;
  labels: string[];
  parentId: string;
  responsibleUid: string;
  files: string[];
};

type CreateTaskProps = {
  fromLabel?: string;
  fromProjectId?: string;
  fromTodayEmptyView?: boolean;
  draftValues?: CreateTaskValues;
};

function CreateTask({ fromProjectId, fromLabel, fromTodayEmptyView, draftValues }: CreateTaskProps) {
  const { push, pop } = useNavigation();

  const { data, setData, isLoading } = useSyncData();

  const labels = data?.labels;
  const projects = data?.projects;
  const sections = data?.sections;

  const lowestPriority = priorities[priorities.length - 1];

  const { handleSubmit, itemProps, values, focus, reset } = useForm<CreateTaskValues>({
    async onSubmit(values) {
      const body: AddTaskArgs = { content: values.content, description: values.description };

      if (values.date) {
        body.due = {
          date: Form.DatePicker.isFullDay(values.date) ? getAPIDate(values.date) : values.date.toISOString(),
        };
      }

      if (values.deadline) {
        body.deadline = {
          date: getAPIDate(values.deadline),
        };
      }

      if (values.duration) {
        body.duration = {
          unit: "minute",
          amount: parseInt(values.duration, 10),
        };
      }

      if (values.priority) {
        body.priority = parseInt(values.priority);
      }

      if (values.projectId) {
        body.project_id = values.projectId;
      }

      if (values.sectionId) {
        body.section_id = values.sectionId;
      }
      if (values.responsibleUid) {
        body.responsible_uid = values.responsibleUid;
      }

      if (values.labels && values.labels.length > 0) {
        body.labels = values.labels;
      }

      if (values.parentId) {
        body.parent_id = values.parentId;
      }

      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
      await toast.show();

      try {
        const { id, data: newData } = await addTask(body, { data, setData });
        toast.style = Toast.Style.Success;
        toast.title = "Task created";

        if (id) {
          toast.primaryAction = {
            title: "Open Task",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => push(<TaskDetail taskId={id} />),
          };

          toast.secondaryAction = {
            title: `Open Task ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(isTodoistInstalled ? getTaskAppUrl(id) : getTaskUrl(id));
            },
          };

          if (values.files.length > 0) {
            try {
              toast.message = "Uploading file and adding to comment…";
              const file = await uploadFile(values.files[0]);
              await addComment({ item_id: id, file_attachment: file, content: "" }, { data: newData, setData });
              toast.message = "File uploaded and added to comment";
            } catch (error) {
              toast.message = `Failed uploading file and adding to comment`;
            }
          }
        }

        if (fromProjectId) {
          pop();
        }

        reset({
          content: "",
          description: "",
          date: null,
          deadline: null,
          priority: String(lowestPriority.value),
          projectId: "",
          sectionId: "",
          responsibleUid: "",
          labels: [],
          files: [],
          parentId: "",
        });

        focus("content");
      } catch (error) {
        handleError({ error, title: "Unable to create task" });
      }
    },
    initialValues: {
      content: draftValues?.content,
      description: draftValues?.description,
      date: draftValues?.date ?? (fromTodayEmptyView ? new Date() : null),
      deadline: draftValues?.deadline ?? null,
      duration: draftValues?.duration ?? "",
      priority: draftValues?.priority ?? String(lowestPriority.value),
      projectId: draftValues?.projectId ?? fromProjectId ?? "",
      sectionId: draftValues?.sectionId ?? "",
      responsibleUid: draftValues?.responsibleUid ?? "",
      labels: draftValues?.labels ?? (fromLabel ? [fromLabel] : []),
    },
    validation: {
      content: FormValidation.Required,
      duration: (value) => {
        if (value && Number.isNaN(parseInt(value, 10))) {
          return "Duration must be a number";
        }
      },
    },
  });

  const projectSections = sections?.filter((section) => section.project_id === values.projectId);

  const collaborators = getProjectCollaborators(values.projectId, data);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.Plus} />

          <RefreshAction />
        </ActionPanel>
      }
      enableDrafts={!fromProjectId && !fromTodayEmptyView && !fromLabel}
    >
      <Form.TextField {...itemProps.content} title="Title" placeholder="Buy fruits" />

      <Form.TextArea
        {...itemProps.description}
        title="Description"
        placeholder="Apples, pears, and strawberries (Markdown supported)"
        enableMarkdown
      />

      <Form.Separator />

      <Form.DatePicker {...itemProps.date} title="Date" />

      {values.date && !Form.DatePicker.isFullDay(values.date) ? (
        <Form.TextField {...itemProps.duration} title="Duration (minutes)" />
      ) : null}

      <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} />

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
          <Form.Dropdown.Item title="No project" value="" icon={Icon.List} />

          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              icon={getProjectIcon(project)}
              title={project.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {projectSections && projectSections.length > 0 ? (
        <Form.Dropdown {...itemProps.sectionId} title="Section">
          <Form.Dropdown.Item
            value=""
            title="No section"
            icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
          />

          {projectSections.map(({ id, name }) => (
            <Form.Dropdown.Item
              key={id}
              value={id}
              title={name}
              icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {collaborators && collaborators.length > 0 ? (
        <Form.Dropdown {...itemProps.responsibleUid} title="Assignee">
          <Form.Dropdown.Item icon={Icon.Person} value="" title="Unassigned" />

          {collaborators.map((collaborator) => (
            <Form.Dropdown.Item
              key={collaborator.id}
              value={collaborator.id}
              title={collaborator.full_name}
              icon={getCollaboratorIcon(collaborator)}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {labels && labels.length > 0 ? (
        <Form.TagPicker {...itemProps.labels} title="Labels">
          {labels.map(({ id, name, color }) => (
            <Form.TagPicker.Item
              key={id}
              value={name}
              title={name}
              icon={{ source: Icon.Tag, tintColor: getColorByKey(color).value }}
            />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.Separator />

      <Form.FilePicker {...itemProps.files} title="File" canChooseDirectories={false} allowMultipleSelection={false} />

      <Form.Dropdown {...itemProps.parentId} title="Parent Task">
        <Form.Dropdown.Item value="" title="None" />

        {data?.items.map((item) => {
          return <Form.Dropdown.Item key={item.id} title={item.content} icon={getPriorityIcon(item)} value={item.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command(props: CreateTaskProps) {
  return (
    <View>
      <CreateTask {...props} />
    </View>
  );
}
