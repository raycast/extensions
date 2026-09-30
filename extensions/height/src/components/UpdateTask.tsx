import { Action, ActionPanel, environment, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

import { batchUpdateTask, getTask, updateTask } from "@/api/task";
import useFieldTemplates from "@/hooks/useFieldTemplates";
import useLists from "@/hooks/useLists";
import useTasks from "@/hooks/useTasks";
import useUsers from "@/hooks/useUsers";
import { TaskObject, UpdateBatchTaskPayload, UpdateTaskFormValues, UpdateTaskPayload } from "@/types/task";
import { CachedPromiseMutateType } from "@/types/utils";
import { getTintColorFromHue, ListColors } from "@/utils/list";
import { getIconByStatusState } from "@/utils/task";

type Props = {
  task: TaskObject;
  mutateTask: CachedPromiseMutateType<typeof getTask>;
  detailsTaskRevalidate?: () => void;
  detailsPage?: boolean;
};

export default function UpdateList({ task, mutateTask, detailsPage, detailsTaskRevalidate }: Props) {
  const { appearance } = environment;
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { lists, listsIsLoading } = useLists();
  const { fieldTemplatesStatuses, fieldTemplatesDueDate, fieldTemplatesIsLoading } = useFieldTemplates();
  const { users, usersIsLoading } = useUsers();
  const { tasks, tasksIsLoading } = useTasks();

  const taskDueDate = task.fields.find((field) => field.fieldTemplateId === fieldTemplatesDueDate?.id);

  const { handleSubmit, itemProps, reset, values } = useForm<UpdateTaskFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task" });

      const payload: UpdateTaskPayload = {
        assigneesIds: values.assigneesIds,
        listIds: values.listIds,
      };

      const batchPayload: UpdateBatchTaskPayload = {
        patches: [
          {
            taskIds: [task.id],
            effects: [
              {
                type: "name",
                name: values.name,
              },
              {
                type: "description",
                description: {
                  message: values.description,
                },
              },
              {
                type: "status",
                status: values.status,
              },
              {
                type: "parentTask",
                parentTaskId: values.parentTaskId || null,
              },
              {
                type: "fields",
                fieldTemplateId: fieldTemplatesDueDate?.id,
                field: {
                  date: values.dueDate || null,
                },
              },
            ],
          },
        ],
      };

      try {
        await mutateTask(updateTask(task.id, payload));
        await mutateTask(batchUpdateTask(batchPayload));
        if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

        toast.style = Toast.Style.Success;
        toast.title = "Successfully updated task 🎉";

        reset({
          name: "",
          listIds: [],
          description: "",
          status: "",
          assigneesIds: [],
          parentTaskId: "",
          dueDate: null,
        });

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update task 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: task.name ?? "",
      listIds: task.listIds ?? [],
      description: task.description ?? "",
      status: task.status ?? "backLog",
      assigneesIds: task.assigneesIds ?? [],
      parentTaskId: task.parentTaskId ?? "",
      dueDate: taskDueDate ? new Date(taskDueDate?.date || "") : null,
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
      isLoading={isLoading || listsIsLoading || fieldTemplatesIsLoading || usersIsLoading || tasksIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update task" onSubmit={handleSubmit} />
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

      <Form.Dropdown title="Parent Task" {...itemProps.parentTaskId}>
        <Form.Dropdown.Item value="" title="No Task" />
        {tasks
          ?.filter(
            (filteredParentTask) =>
              filteredParentTask.listIds.some((id) => values.listIds.includes(id)) && filteredParentTask.id !== task.id,
          )
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
