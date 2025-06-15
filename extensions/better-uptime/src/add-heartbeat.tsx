import { Form, ActionPanel, Action, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "node-fetch";

interface AddHeartbeatFormValues {
  name: string;
  period: string;
  grace: string;
}

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit } = useForm<AddHeartbeatFormValues>({
    async onSubmit(values) {
      await showToast({ title: "Creating heartbeat...", style: Toast.Style.Animated });

      await fetch(`${baseUrl}/heartbeats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw { response: { data: errorData } };
          }

          await showToast({ title: "Heartbeat created", style: Toast.Style.Success });

          popToRoot();
        })
        .catch(async (error) => {
          await showToast({
            title: "Heartbeat not created",
            style: Toast.Style.Failure,
            message: error.response.data.errors,
          });
        });
    },
    validation: {
      name: FormValidation.Required,
      period: FormValidation.Required,
      grace: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Heartbeat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Daily database backup" />
      <Form.TextField id="period" title="Period in seconds" defaultValue="10800" />
      <Form.TextField id="grace" title="Grace in seconds" defaultValue="300" />
    </Form>
  );
}
