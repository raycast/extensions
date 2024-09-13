import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";

interface Preferences {
  accessToken: string;
}

type Values = {
  prompt: string;
};

export default function Command() {
  const { accessToken } = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values: Values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding reminder..." });

      try {
        const response = await fetch("https://getrecapai.vercel.app/api/add-reminder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ prompt: values.prompt }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Added reminder:";
        toast.message = values.prompt;
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to add reminder:";
        if (err instanceof Error) {
          toast.message = err.message;
        } else {
          toast.message = "An unknown error occurred";
        }
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://developers.raycast.com/api-reference/user-interface/form"
          text="Add more reminders"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Reminder" placeholder="What would you like to remember better?" {...itemProps.prompt} />
      <Form.Description text="You have 9 reminders left." />
    </Form>
  );
}
