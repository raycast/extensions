import { Form, ActionPanel, Action, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { getErrorMessage, getResponseErrorMessage } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "node-fetch";

interface AddHeartbeatFormValues {
  name: string;
  period: string;
  grace: string;
}

export default function AddHeartbeatCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps } = useForm<AddHeartbeatFormValues>({
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
            throw new Error(await getResponseErrorMessage(response));
          }

          await showToast({ title: "Heartbeat created", style: Toast.Style.Success });

          popToRoot();
        })
        .catch(async (error) => {
          await showToast({
            title: "Heartbeat not created",
            style: Toast.Style.Failure,
            message: getErrorMessage(error),
          });
        });
    },
    initialValues: {
      period: "10800",
      grace: "300",
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
      <Form.TextField title="Name" placeholder="Daily database backup" {...itemProps.name} />
      <Form.TextField title="Period in seconds" {...itemProps.period} />
      <Form.TextField title="Grace in seconds" {...itemProps.grace} />
    </Form>
  );
}
