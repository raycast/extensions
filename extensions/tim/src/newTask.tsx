import { Action, ActionPanel, captureException, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createTask, startTask } from "./lib/tim";

type FormData = {
  title: string;
  startTask: boolean;
};

export default function Command() {
  const handleSubmit = async (values: FormData) => {
    await showToast({
      title: "Creating task",
      message: values.title,
      style: Toast.Style.Animated,
    });

    try {
      const id = await createTask(values.title);
      if (values.startTask) {
        await startTask(id);
      }

      await showToast({
        title: `Task "${values.title}" created`,
        message: values.startTask ? "Task started" : undefined,
      });
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: `Could not create ${values.title}` });
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
