import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation, useFetch } from "@raycast/utils";
import fetch from "node-fetch";

interface Preferences {
  accessToken: string;
}

type Values = {
  prompt: string;
};

interface RemindersLeftResponse {
  remindersLeft: number;
}

export default function Command() {
  const { accessToken } = getPreferenceValues<Preferences>();
  const { isLoading, data, revalidate } = useFetch<RemindersLeftResponse>(
    "https://getrecapai.vercel.app/api/get-reminders-left",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const { handleSubmit, itemProps, reset } = useForm<Values>({
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
        revalidate();
        reset();
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

  if (data?.remindersLeft === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Add More Reminders" url="https://getrecap.xyz/home" />
          </ActionPanel>
        }
      >
        <Form.Description text="You've used all your free reminders." />
        <Form.Description text="Please add more from getrecap.xyz to continue." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={<Form.LinkAccessory target="https://getrecap.xyz/home" text="Add More Reminders" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Reminder" placeholder="What would you like to remember better?" {...itemProps.prompt} />
      {data?.remindersLeft && <Form.Description text={`You have ${data.remindersLeft} reminders available.`} />}
    </Form>
  );
}
