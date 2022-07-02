import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { useState } from "react";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const [monitorType, setMonitorType] = useState("status");

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
      <Form.Dropdown
        id="monitor_type"
        title="Monitor Type"
        onChange={(value) => setMonitorType(value)}
      >
        <Form.Dropdown.Item key="status" value="status" title="Status" />
        <Form.Dropdown.Item key="ping" value="ping" title="Ping" />
      </Form.Dropdown>
      <Form.TextField
        id="url"
        title={monitorType === "status" ? "URL" : "Host"}
        placeholder={monitorType === "status" ? "https://raycast.com" : "76.76.21.21"}
      />
      <Form.TextField id="check_frequency" title="Check Frequency (seconds)" placeholder="180" />
    </Form>
  );
}
