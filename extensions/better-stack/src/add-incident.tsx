import { Form, ActionPanel, Action, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { getErrorMessage, getResponseErrorMessage } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "node-fetch";

interface AddIncidentFormValues {
  summary: string;
  description: string;
  requester_email: string;
}

export default function AddIncidentCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps } = useForm<AddIncidentFormValues>({
    async onSubmit(values) {
      await showToast({
        title: "Creating incident...",
        style: Toast.Style.Animated,
      });

      await fetch(`${baseUrl}/incidents`, {
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

          await showToast({
            title: "Incident created",
            style: Toast.Style.Success,
          });

          popToRoot();
        })
        .catch(async (error) => {
          await showToast({
            title: "Incident not created",
            style: Toast.Style.Failure,
            message: getErrorMessage(error),
          });
        });
    },
    validation: {
      summary: FormValidation.Required,
      description: FormValidation.Required,
      requester_email: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Incident" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Summary" placeholder="New users can't sign up" {...itemProps.summary} />
      <Form.TextField title="Description" placeholder="Enter a description" {...itemProps.description} />
      <Form.TextField title="Requester Email" placeholder="john@example.com" {...itemProps.requester_email} />
    </Form>
  );
}
