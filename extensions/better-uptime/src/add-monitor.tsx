import { Form, ActionPanel, Action, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import fetch from "node-fetch";

interface AddMonitorFormValues {
  url: string;
  checkFrequency: string;
  tcpTimeout: string;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  pronounceable_name: string;
  monitor_type: string;
}

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const [monitorType, setMonitorType] = useState("status");
  const { handleSubmit } = useForm<AddMonitorFormValues>({
    async onSubmit(values) {
      await showToast({
        title: "Creating monitor...",
        style: Toast.Style.Animated,
      });

      await fetch(`${baseUrl}/monitors`, {
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

          await showToast({
            title: "Monitor created",
            style: Toast.Style.Success,
          });

          popToRoot();
        })
        .catch(async (error) => {
          await showToast({
            title: "Monitor not created",
            style: Toast.Style.Failure,
            message: error.response.data.errors,
          });
        });
    },
    validation: {
      url: FormValidation.Required,
      checkFrequency: FormValidation.Required,
      tcpTimeout: FormValidation.Required,
    },
  });

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
      {monitorType === "status" && (
        <Form.TextField id="check_frequency" title="Check Frequency (seconds)" defaultValue="180" />
      )}
      {monitorType === "ping" && <Form.TextField id="tcp_timeout" title="Ping Timeout" defaultValue="5" />}
      <Form.Checkbox id="call" label="Call" defaultValue={false} />
      <Form.Checkbox id="sms" label="Send SMS" defaultValue={false} />
      <Form.Checkbox id="email" label="Send Email" defaultValue={true} />
      <Form.Checkbox id="push" label="Push Notification" defaultValue={false} />
      <Form.TextField id="pronounceable_name" title="Pronounceable Name" />
    </Form>
  );
}
