import { Form, ActionPanel, showToast, Toast, Action, getPreferenceValues, Icon } from "@raycast/api";
import got from "got";

interface FormInputs {
  taskdescription: string;
}

interface Preferences {
  apiKey: string
}

export default function () {
  const preferences = getPreferenceValues<Preferences>()

  async function handleSubmit(values: FormInputs) {
    showToast(Toast.Style.Animated, "Creating the task");

    if (values.taskdescription == "")
      return showToast(Toast.Style.Failure, "Couldn't create an empty task")

    try {
      await got.post("https://serv.amazingmarvin.com/api/addTask", {
        json: {
          title: values.taskdescription
        },
        headers: {
          'X-Api-Token': preferences.apiKey
        }
      })

      showToast(Toast.Style.Success, "Task created");
    } catch (error) {
      showToast(Toast.Style.Failure, `Couldn't create the task: ${error.message}`)
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Task" icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.TextField id="taskdescription" title="Task description" />
    </Form>
  );
}
