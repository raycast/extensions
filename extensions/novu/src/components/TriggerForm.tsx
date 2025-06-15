import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { IFormData } from "../interfaces/interfaces";
import { triggerEvent } from "../services/api";
import useTriggerHistory from "../hooks/useTriggerHistory";
import { useForm, FormValidation } from "@raycast/utils";
import { isJsonString } from "../services/utils";

export default function TriggerForm() {
  const { history: recentTriggers, addTrigger, reload } = useTriggerHistory();

  const { handleSubmit, itemProps, setValue } = useForm<IFormData>({
    onSubmit(values) {
      saveTigger(values);
    },
    validation: {
      requestDomain: FormValidation.Required,
      notificationIdentifier: FormValidation.Required,
      subscriberId: FormValidation.Required,
      apiKey: FormValidation.Required,
      payload: (value) => {
        if (!isJsonString(value ?? "")) {
          return "Payload should be a valid JSON string";
        }
      },
    },
  });

  async function saveTigger(values: IFormData): Promise<void> {
    addTrigger(values);
    reload();
    await submitToast();
  }

  useEffect(() => {
    setValue("requestDomain", recentTriggers[0]?.requestDomain);
    setValue("notificationIdentifier", recentTriggers[0]?.notificationIdentifier);
    setValue("subscriberId", recentTriggers[0]?.subscriberId);
    setValue("apiKey", recentTriggers[0]?.apiKey);
    setValue("payload", recentTriggers[0]?.payload);
  }, [!!recentTriggers[0]]);

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
            <Action
              title="Trigger Notification"
              onAction={() => {
                if (recentTriggers[0]) {
                  triggerEvent(recentTriggers[0]);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField title="Request Domain" placeholder="http://localhost:3000" {...itemProps.requestDomain} />
        <Form.TextField
          title="Notification Identifier"
          placeholder="Enter Notification Identifier from Edit Template page"
          {...itemProps.notificationIdentifier}
        />
        <Form.TextField title="Subscriber ID" placeholder="Enter Subscriber ID" {...itemProps.subscriberId} />
        <Form.PasswordField title="API Key" placeholder="API Key from the Settings page" {...itemProps.apiKey} />
        <Form.TextArea title="payload" placeholder="Enter the payload in json format" {...itemProps.payload} />
      </Form>
    </>
  );
}

export async function submitToast() {
  await showToast({
    style: Toast.Style.Success,
    title: "Form Submitted",
  });
}
