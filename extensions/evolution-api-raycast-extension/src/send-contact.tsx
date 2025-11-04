import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendContact } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  number: string;
  fullName: string;
  wuid: string;
  phoneNumber: string;
  organization?: string;
  email?: string;
  url?: string;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);

  if (isChecking) return <Form isLoading={true} />;
  if (!isValid) return <Form isLoading={false} />;

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      await sendContact({
        instanceName: values.instanceName,
        number: values.number,
        contact: [
          {
            fullName: values.fullName,
            wuid: values.wuid,
            phoneNumber: values.phoneNumber,
            organization: values.organization,
            email: values.email,
            url: values.url,
          },
        ],
      });
      await showToast({ style: Toast.Style.Success, title: "Contact sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send contact";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send Contact"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="number" title="Recipient Number" placeholder="e.g. 55999999999" />
      <Form.Separator />
      <Form.TextField id="fullName" title="Contact Full Name" placeholder="John Doe" />
      <Form.TextField id="wuid" title="WhatsApp UID" placeholder="55999999999" />
      <Form.TextField id="phoneNumber" title="Phone Number" placeholder="+55 99 9 9999-9999" />
      <Form.TextField id="organization" title="Organization (optional)" placeholder="Company Name" />
      <Form.TextField id="email" title="Email (optional)" placeholder="john@example.com" />
      <Form.TextField id="url" title="URL (optional)" placeholder="https://example.com" />
    </Form>
  );
}
