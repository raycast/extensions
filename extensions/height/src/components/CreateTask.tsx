import {
  Action,
  ActionPanel,
  environment,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

import { createTask } from "@/api/task";
import useFieldTemplates from "@/hooks/useFieldTemplates";
import useLists from "@/hooks/useLists";
import useTasks from "@/hooks/useTasks";
import useUsers from "@/hooks/useUsers";
import { CreateTaskFormValues, CreateTaskPayload } from "@/types/task";
import { getTintColorFromHue, ListColors } from "@/utils/list";
import { getIconByStatusState } from "@/utils/task";

export default function CreateList({ draftValues }: { draftValues?: CreateTaskFormValues }) {
  const { appearance } = environment;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { lists, listsIsLoading } = useLists();
  const { fieldTemplatesStatuses, fieldTemplatesDueDate, fieldTemplatesIsLoading } = useFieldTemplates();
  const { users, usersIsLoading } = useUsers();
  const { tasks, tasksIsLoading } = useTasks();

  const { handleSubmit, itemProps, reset, values } = useForm<CreateTaskFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding task" });

      const payload: CreateTaskPayload = {
        name: values.name,
        listIds: values.listIds,
        description: values.description,
        status: values.status,
        assigneesIds: values.assigneesIds,
      };

      if (values.parentTaskId) {
        payload.parentTaskId = values.parentTaskId;
      }

      if (values.dueDate) {
        payload.fields = [{ fieldTemplateId: fieldTemplatesDueDate?.id, date: values.dueDate }];
      }

      try {
        const [data, error] = await createTask(payload);

        if (data) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created task 🎉";

          reset({
            name: "",
            listIds: [],
            description: "",
            status: "",
            assigneesIds: [],
            parentTaskId: "",
            dueDate: null,
          });

          await launchCommand({ name: "search_tasks", type: LaunchType.UserInitiated });
        }

        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create task 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: draftValues?.name ?? "",
      listIds: draftValues?.listIds ?? [],
      description: draftValues?.description ?? "",
      status: draftValues?.status ?? "backLog",
      assigneesIds: draftValues?.assigneesIds ?? [],
      parentTaskId: draftValues?.parentTaskId ?? "",
      dueDate: draftValues?.dueDate ?? undefined,
    },
    validation: {
      name: (value) => {
        if (!value || value.length === 0) {
          return "Name is required";
        }
      },
      listIds: (value) => {
        if (!value || value.length === 0) {
          return "List is required";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts
      isLoading={isLoading || listsIsLoading || fieldTemplatesIsLoading || usersIsLoading || tasksIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.NewDocument} />
        </ActionPanel>
      }
    >
      <Form.TagPicker autoFocus title="Lists" {...itemProps.listIds}>
        {lists?.map((list) => (
          <Form.TagPicker.Item
            key={list.id}
            value={list.id}
            title={list.name}
            icon={{
              source: list.appearance?.iconUrl ?? "list-icons/list.svg",
              tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
            }}
          />
        ))}
      </Form.TagPicker>

      <Form.TextField title="Name" placeholder="Enter name of task" {...itemProps.name} />

      <Form.TextArea
        title="Description"
        placeholder="Describe task (supports Markdown e.g. **bold**)"
        {...itemProps.description}
      />

      <Form.Dropdown title="Status" {...itemProps.status}>
        {fieldTemplatesStatuses?.map((status) => (
          <Form.Dropdown.Item
            key={status.id}
            value={status.id}
            title={status.value}
            icon={{
              source: getIconByStatusState(status.id, fieldTemplatesStatuses),
              tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                typeof status?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
              })`,
            }}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker title="Assignees" {...itemProps.assigneesIds}>
        {users?.map((user) => (
          <Form.TagPicker.Item
            key={user.id}
            value={user.id}
            title={`${user.firstname} ${user.lastname}`}
            icon={{
              source: user?.pictureUrl ?? Icon.Person,
              tintColor: user?.pictureUrl
                ? undefined
                : `hsl(${user?.hue ?? "0"}, 80%, ${
                    typeof user?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                  })`,
            }}
          />
        ))}
      </Form.TagPicker>

      <Form.DatePicker title="Due Date" {...itemProps.dueDate} />

      <Form.Dropdown
        title="Parent Task"
        info="The Parent Task depends on the Lists you selected above."
        {...itemProps.parentTaskId}
      >
        <Form.Dropdown.Item value="" title="No Task" />
        {tasks
          ?.filter((filteredParentTask) => filteredParentTask.listIds.some((id) => values.listIds.includes(id)))
          ?.map((task) => {
            return (
              <Form.Dropdown.Item
                key={task.id}
                value={task.id}
                title={task.name}
                icon={{
                  source: task.lists?.[0].appearance?.iconUrl ?? "list-icons/list.svg",
                  tintColor: getTintColorFromHue(task.lists?.[0]?.appearance?.hue, ListColors),
                }}
              />
            );
          })}
      </Form.Dropdown>
    </Form>
  );
}
