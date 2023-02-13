import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, useForm } from "@raycast/utils";
import { useState } from "react";
import { ApiTask } from "../api/task";
import { TaskObject, UpdateTaskFormValues, UpdateTaskPayload } from "../types/task";
import { ApiResponse } from "../types/utils";
import { ListTypes, ListVisualizations } from "../utils/list";

type Props = {
  task: TaskObject;
  mutateTask: MutatePromise<ApiResponse<TaskObject[]> | undefined>;
};

export default function UpdateList({ task, mutateTask }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps, reset } = useForm<UpdateTaskFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task" });

      const payload: UpdateTaskPayload = {
        name: values.name,
        description: values.description,
        assigneesIds: values.assigneesIds,
        status: values.status,
        listIds: values.listIds,
        parentTaskId: values.parentTaskId,
      };

      try {
        await mutateTask(ApiTask.update(task.id, payload));

        toast.style = Toast.Style.Success;
        toast.title = "Successfully updated task 🎉";

        reset({
          name: "",
          description: "",
          assigneesIds: [],
          status: "todo",
          listIds: [],
          parentTaskId: null,
        });

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update task";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      listIds: task.listIds ?? [],
      status: task.status ?? "todo",
      name: task.name ?? "",
      description: task.description ?? "",
      assigneesIds: task.assigneesIds ?? [],
      parentTaskId: task.parentTaskId ?? null,
    },
    validation: {},
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.status}>
        {ListTypes.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Visualization" {...itemProps.visualization}>
        {ListVisualizations.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Describe list" {...itemProps.description} />

      <Form.TextField title="Hue" placeholder="Enter number from 0 to 360" {...itemProps.hue} />
    </Form>
  );
}
