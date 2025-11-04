import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendStatus } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  type: "text" | "image" | "video" | "audio";
  content: string;
  caption?: string;
  backgroundColor?: string;
  font?: string;
  allContacts: boolean;
  statusJidList?: string;
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
      const jidList = values.statusJidList
        ?.split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await sendStatus(values.instanceName, {
        type: values.type,
        content: values.content,
        caption: values.caption,
        backgroundColor: values.backgroundColor,
        font: values.font ? parseInt(values.font, 10) : undefined,
        allContacts: values.allContacts,
        statusJidList: jidList,
      });
      await showToast({ style: Toast.Style.Success, title: "Status/Story sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send status";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send Status/Stories"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.Dropdown id="type" title="Type" defaultValue="text">
        <Form.Dropdown.Item value="text" title="Text" />
        <Form.Dropdown.Item value="image" title="Image" />
        <Form.Dropdown.Item value="video" title="Video" />
        <Form.Dropdown.Item value="audio" title="Audio" />
      </Form.Dropdown>
      <Form.TextArea id="content" title="Content" placeholder="Text or media URL" />
      <Form.TextField id="caption" title="Caption (optional)" placeholder="For image/video" />
      <Form.TextField id="backgroundColor" title="Background Color (optional)" placeholder="e.g. #008000" />
      <Form.TextField id="font" title="Font (1-5, optional)" placeholder="1=SERIF, 2=NORICAN..." />
      <Form.Checkbox id="allContacts" title="Send to All Contacts" label="Enable" defaultValue={false} />
      <Form.TextArea
        id="statusJidList"
        title="Status JID List (one per line)"
        placeholder="55999999999@s.whatsapp.net"
      />
    </Form>
  );
}
