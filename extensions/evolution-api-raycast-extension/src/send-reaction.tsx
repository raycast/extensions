import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendReaction } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  remoteJid: string;
  fromMe: boolean;
  messageId: string;
  reaction: string;
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
      await sendReaction({
        instanceName: values.instanceName,
        key: {
          remoteJid: values.remoteJid,
          fromMe: values.fromMe,
          id: values.messageId,
        },
        reaction: values.reaction,
      });
      await showToast({ style: Toast.Style.Success, title: "Reaction sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send reaction";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send Reaction"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="remoteJid" title="Remote JID" placeholder="e.g. 55999999999@s.whatsapp.net" />
      <Form.TextField id="messageId" title="Message ID" placeholder="Message key ID" />
      <Form.Checkbox id="fromMe" title="From Me" label="Is the message from me?" defaultValue={false} />
      <Form.TextField id="reaction" title="Reaction Emoji" placeholder="e.g. 🚀" />
    </Form>
  );
}
