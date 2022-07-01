import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(item: any) {
    axios
      .post("https://betteruptime.com/api/v2/incidents", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        popToRoot();

        showToast({ title: "Success", message: "Successfully added incident" });
      })
      .catch((error) => {
        showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Incident" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="summary" title="Summary" placeholder="New users can't sign up" />
      <Form.TextField id="description" title="Description" />
      <Form.TextField id="requester_email" title="Requester Email" placeholder="john@example.com" />
    </Form>
  );
}
