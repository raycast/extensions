import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendTextMessage } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  number: string;
  text: string;
  linkPreview: boolean;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);

  if (isChecking) {
    return <Form isLoading={true} />;
  }

  if (!isValid) {
    return <Form isLoading={false} />;
  }

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      // Build the options object
      const options: {
        instanceName: string;
        number: string;
        text: string;
        linkPreview?: boolean;
      } = {
        instanceName: values.instanceName,
        number: values.number,
        text: values.text,
      };

      // Add optional fields
      if (values.linkPreview !== undefined) {
        options.linkPreview = values.linkPreview;
      }

      await sendTextMessage(options);
      await showToast({ style: Toast.Style.Success, title: "Message sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send message";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send WhatsApp Message"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="number" title="Recipient Number" placeholder="e.g. 55999999999" />
      <Form.TextArea id="text" title="Message" placeholder="Type your message" />

      <Form.Separator />
      <Form.Description text="Additional Options" />

      <Form.Checkbox
        id="linkPreview"
        label="Enable Link Preview"
        info="Show preview for URLs in the message"
        defaultValue={false}
        storeValue
      />
    </Form>
  );
}
