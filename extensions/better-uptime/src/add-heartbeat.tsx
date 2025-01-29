import { Form, ActionPanel, Action, getPreferenceValues, popToRoot } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { FormValidation, useForm } from "@raycast/utils";

interface AddHeartbeatFormValues {
  name: string;
  period: string;
  grace: string;
}

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps } = useForm<AddHeartbeatFormValues>({
    async onSubmit(values) {
      console.log(values);

      // const toast = showToast({
      //   style: Toast.Style.Success,
      //   title: "Submitting...",
      //   message: "Heartbeat is being created",
      // });

      await fetch(`${baseUrl}/heartbeats`, {
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
          // toast.title = "Heartbeat created successfully";

          popToRoot();
        })
        .catch((error) => {
          // toast.style = Toast.Style.Failure;
          // toast.title = "Unable to create heartbeat";
          // toast.message = error.response.data.errors;
          console.log(error);
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
