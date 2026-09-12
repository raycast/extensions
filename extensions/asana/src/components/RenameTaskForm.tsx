import { Action, ActionPanel, Form, useNavigation, Toast, showToast } from "@raycast/api";
import { FormValidation, useForm, MutatePromise } from "@raycast/utils";
import { getErrorMessage } from "../helpers/errors";
import { Task, updateTask } from "../api/tasks";

type RenameFormValues = {
  name: string;
};

type RenameTaskFormProps = {
  task: Task;
  mutateList?: MutatePromise<Task[] | undefined>;
  mutateDetail?: MutatePromise<Task>;
};

export default function RenameTaskForm({ task, mutateList, mutateDetail }: RenameTaskFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<RenameFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming task" });

      try {
        const asyncUpdate = updateTask(task.gid, { name: values.name });

        await Promise.all([
          asyncUpdate,
          mutateList
            ? mutateList(asyncUpdate, {
                optimisticUpdate(data) {
                  if (!data) {
                    return;
                  }
                  return data.map((t) => (t.gid === task.gid ? { ...t, name: values.name } : t));
                },
              })
            : Promise.resolve(),
          mutateDetail
            ? mutateDetail(asyncUpdate, {
                optimisticUpdate(data) {
                  return { ...data, name: values.name };
                },
              })
            : Promise.resolve(),
        ]);

        toast.style = Toast.Style.Success;
        toast.title = "Renamed task";
        toast.message = values.name;

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to rename task";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: task.name,
    },
  });

  return (
    <Form
      navigationTitle="Rename Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Task name" autoFocus {...itemProps.name} />
    </Form>
  );
}
