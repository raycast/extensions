import { Action, ActionPanel, Form, Icon, useNavigation, Toast, showToast } from "@raycast/api";
import { format } from "date-fns";
import { FormValidation, getAvatarIcon, useForm, MutatePromise } from "@raycast/utils";
import { useUsers } from "../hooks/useUsers";
import { useMe } from "../hooks/useMe";
import { useSections } from "../hooks/useSections";
import { getErrorMessage } from "../helpers/errors";
import { escapeHtml } from "../helpers/task";
import TaskDetail from "./TaskDetail";
import { Task, createSubtask, SubtaskPayload } from "../api/tasks";

type SubtaskFormValues = {
  name: string;
  description: string;
  assignee: string;
  due_date: Date | null;
  section: string;
};

type CreateSubtaskFormProps = {
  parentTask: Task;
  workspace?: string;
  mutateSubtasks?: MutatePromise<Task[] | undefined>;
};

export default function CreateSubtaskForm({ parentTask, workspace, mutateSubtasks }: CreateSubtaskFormProps) {
  const { push } = useNavigation();

  const { data: users, isLoading: isLoadingUsers } = useUsers(workspace);
  const { data: me, isLoading: isLoadingMe } = useMe();

  const parentProjectId = parentTask.projects[0]?.gid;
  const { data: sections, isLoading: isLoadingSections } = useSections(parentProjectId);

  const { handleSubmit, itemProps, reset, focus } = useForm<SubtaskFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating subtask" });

      try {
        const payload: SubtaskPayload = {
          name: values.name,
          ...(values.description ? { html_notes: `<body>${escapeHtml(values.description)}</body>` } : {}),
          ...(values.assignee ? { assignee: values.assignee } : {}),
          ...(values.due_date ? { due_on: format(values.due_date, "yyyy-MM-dd") } : {}),
          ...(parentProjectId
            ? {
                memberships: [{ project: parentProjectId, ...(values.section ? { section: values.section } : {}) }],
              }
            : {}),
        };

        const subtask = await createSubtask(parentTask.gid, payload);

        if (mutateSubtasks) {
          mutateSubtasks();
        }

        toast.style = Toast.Style.Success;
        toast.title = "Created subtask";

        toast.primaryAction = {
          title: "Open Subtask",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: () => push(<TaskDetail task={subtask} workspace={workspace} />),
        };

        reset({
          name: "",
          description: "",
          due_date: null,
          assignee: values.assignee,
          section: values.section,
        });

        focus("name");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create subtask";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: "",
      description: "",
      assignee: "",
      due_date: null,
      section: "",
    },
  });

  const projectInfo = parentTask.projects.length > 0 ? parentTask.projects.map((p) => p.name).join(", ") : "No project";

  return (
    <Form
      navigationTitle={`Add subtask to "${parentTask.name}"`}
      isLoading={isLoadingUsers || isLoadingMe || isLoadingSections}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Subtask" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Parent Task" text={parentTask.name} />
      <Form.Description title="Project" text={projectInfo} />

      {parentProjectId && sections && sections.length > 0 && (
        <Form.Dropdown title="Section" {...itemProps.section}>
          <Form.Dropdown.Item title="No section" value="" icon={Icon.Tray} />
          {sections.map((section) => (
            <Form.Dropdown.Item key={section.gid} value={section.gid} title={section.name} icon={Icon.Tray} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.TextField title="Subtask Name" placeholder="What needs to be done?" autoFocus {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Add more detail (optional)" {...itemProps.description} />

      <Form.Dropdown title="Assignee" {...itemProps.assignee}>
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />
        {users?.map((user) => (
          <Form.Dropdown.Item
            key={user.gid}
            value={user.gid}
            title={user.gid === me?.gid ? `${user.name} (me)` : user.name}
            icon={getAvatarIcon(user.name)}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.due_date} />
    </Form>
  );
}
