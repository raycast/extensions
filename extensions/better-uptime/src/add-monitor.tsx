import { Form, ActionPanel, Action, getPreferenceValues, popToRoot } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

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
  const { handleSubmit, itemProps } = useForm<AddMonitorFormValues>({
    async onSubmit(values) {
      console.log(values);

      // const toast = showToast({
      //   style: Toast.Style.Success,
      //   title: "Submitting...",
      //   message: "Monitor is being created",
      // });

      await fetch(`${baseUrl}/monitors`, {
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
          // toast.title = "Monitor created successfully";

          popToRoot();
        })
        .catch((error) => {
          // toast.style = Toast.Style.Failure;
          // toast.title = "Unable to create monitor";
          // toast.message = error.response.data.errors;
          console.log(error);
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
        placeholder={itemProps.monitor_type.value === "status" ? "https://raycast.com" : "76.76.21.21"}
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
