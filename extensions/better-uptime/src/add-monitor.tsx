import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { useState } from "react";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const [monitorType, setMonitorType] = useState("status");

  async function handleSubmit(item: any) {
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
      <Form.Dropdown id="monitor_type" title="Monitor Type" onChange={(value) => setMonitorType(value)}>
        <Form.Dropdown.Item key="status" value="status" title="Status" />
        <Form.Dropdown.Item key="ping" value="ping" title="Ping" />
      </Form.Dropdown>
      <Form.TextField
        id="url"
        title={monitorType === "status" ? "URL" : "Host"}
        placeholder={monitorType === "status" ? "https://raycast.com" : "76.76.21.21"}
      />
      <Form.TextField id="check_frequency" title="Check Frequency (seconds)" placeholder="180" />
      <Form.Checkbox id="call" label="Call" defaultValue={false} />
      <Form.Checkbox id="sms" label="Send SMS" defaultValue={false} />
      <Form.Checkbox id="email" label="Send Email" defaultValue={true} />
      <Form.Checkbox id="push" label="Push Notification" defaultValue={false} />
      <Form.TextField id="pronounceable_name" title="Pronounceable Name" />
    </Form>
  );
}
