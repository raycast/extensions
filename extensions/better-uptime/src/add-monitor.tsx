import { Form, ActionPanel, Action, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { baseUrl } from "./constants";
import { Preferences } from "./interface";
import { getErrorMessage, getResponseErrorMessage } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "node-fetch";

interface AddMonitorFormValues {
  url: string;
  check_frequency: string;
  request_timeout?: string;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  pronounceable_name: string;
  monitor_type: string;
}

// The values the API accepts, in seconds
const checkFrequencies = [
  { value: "30", title: "30 seconds" },
  { value: "45", title: "45 seconds" },
  { value: "60", title: "1 minute" },
  { value: "120", title: "2 minutes" },
  { value: "180", title: "3 minutes" },
  { value: "300", title: "5 minutes" },
  { value: "600", title: "10 minutes" },
  { value: "900", title: "15 minutes" },
  { value: "1800", title: "30 minutes" },
];

// Ping monitors take their timeout in milliseconds
const pingTimeouts = [
  { value: "500", title: "0.5 seconds" },
  { value: "1000", title: "1 second" },
  { value: "2000", title: "2 seconds" },
  { value: "3000", title: "3 seconds" },
  { value: "5000", title: "5 seconds" },
];

export default function AddMonitorCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps, values } = useForm<AddMonitorFormValues>({
    async onSubmit(formValues) {
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
        body: JSON.stringify({
          ...formValues,
          check_frequency: Number(formValues.check_frequency),
          request_timeout: formValues.monitor_type === "ping" ? Number(formValues.request_timeout) : undefined,
          pronounceable_name: formValues.pronounceable_name || undefined,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await getResponseErrorMessage(response));
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
            message: getErrorMessage(error),
          });
        });
    },
    initialValues: {
      monitor_type: "status",
      check_frequency: "180",
      request_timeout: "5000",
      call: false,
      sms: false,
      email: true,
      push: false,
    },
    validation: {
      url: FormValidation.Required,
    },
  });

  const isPing = values.monitor_type === "ping";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Monitor" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Monitor Type" {...itemProps.monitor_type}>
        <Form.Dropdown.Item key="status" value="status" title="Status" />
        <Form.Dropdown.Item key="ping" value="ping" title="Ping" />
      </Form.Dropdown>
      <Form.TextField
        title={isPing ? "Host" : "URL"}
        placeholder={isPing ? "76.76.21.21" : "https://raycast.com"}
        {...itemProps.url}
      />
      <Form.Dropdown title="Check Frequency" {...itemProps.check_frequency}>
        {checkFrequencies.map(({ value, title }) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      {isPing && (
        <Form.Dropdown title="Ping Timeout" {...itemProps.request_timeout}>
          {pingTimeouts.map(({ value, title }) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox label="Call" {...itemProps.call} />
      <Form.Checkbox label="Send SMS" {...itemProps.sms} />
      <Form.Checkbox label="Send Email" {...itemProps.email} />
      <Form.Checkbox label="Push Notification" {...itemProps.push} />
      <Form.TextField title="Pronounceable Name" {...itemProps.pronounceable_name} />
    </Form>
  );
}
