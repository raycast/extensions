import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(item: any) {
    // {
    //   "monitor_type": "status",
    //   "url": "https://facebook.com",
    //   "pronounceable_name": "Facebook homepage",
    //   "email": true,
    //   "sms": true,
    //   "call": true,
    //   "check_frequency": 30,
    //   "request_headers": [
    //     {
    //       "name": "X-Custom-Header",
    //       "value": "custom header value"
    //     }
    //   ]
    // }

    axios
      .post("https://betteruptime.com/api/v2/monitors", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        popToRoot();

        showToast({ title: "Success", message: "Successfully added monitor" });
      })
      .catch((error) => {
        showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Monitor" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://raycast.com" />
      <Form.TextField id="friendly_name" title="Friendly Name" placeholder="Friendly name" />
    </Form>
  );
}
