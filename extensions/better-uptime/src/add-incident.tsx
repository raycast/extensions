import { Form, ActionPanel, Action, getPreferenceValues, popToRoot } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { FormValidation, useForm } from "@raycast/utils";

interface AddIncidentFormValues {
  summary: string;
  description: string;
  requester_email: string;
}

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps } = useForm<AddIncidentFormValues>({
    async onSubmit(values) {
      console.log(values);

      // const toast = showToast({
      //   style: Toast.Style.Success,
      //   title: "Submitting...",
      //   message: "Incident is being created",
      // });

      await fetch(`${baseUrl}/incidents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemProps),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw { response: { data: errorData } };
          }

          // toast.style = Toast.Style.Success;
          // toast.title = "Incident created successfully";

          popToRoot();
        })
        .catch((error) => {
          // toast.style = Toast.Style.Failure;
          // toast.title = "Unable to create incident";
          // toast.message = error.response.data.errors;
          console.log(error);
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
      <Form.TextField id="summary" title="Summary" placeholder="New users can't sign up" />
      <Form.TextField id="description" title="Description" placeholder="Enter a description" />
      <Form.TextField id="requester_email" title="Requester Email" placeholder="john@example.com" />
    </Form>
  );
}
