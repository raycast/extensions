import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(item: any) {
    axios
      .post("https://betteruptime.com/api/v2/heartbeats", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        popToRoot();

        showToast({ title: "Success", message: "Successfully added heartbeat" });
      })
      .catch((error) => {
        showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Heartbeat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Daily database backup" />
      <Form.TextField id="period" title="Period in seconds" placeholder="10800" />
      <Form.TextField id="grace" title="Grace in seconds" placeholder="300" />
    </Form>
  );
}
