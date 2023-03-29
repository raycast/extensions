import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { createTask, startTask } from "./lib/tim";

type FormData = {
  title: string;
  startTask: boolean;
};

export default function Command() {
  const handleSubmit = async (values: FormData) => {
    const toast = await showToast({
      title: "Creating task",
      message: values.title,
      style: Toast.Style.Animated,
    });

    try {
      const id = await createTask(values.title);
      if (values.startTask) {
        await startTask(id);
      }
      toast.title = "Task created";
      toast.style = Toast.Style.Success;
      popToRoot();
    } catch (error) {
      toast.title = "Error";
      toast.message = `Could not create ${values.title}`;
      toast.style = Toast.Style.Failure;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter a title" />
      <Form.Checkbox id="startTask" label="Start Task" />
    </Form>
  );
}
