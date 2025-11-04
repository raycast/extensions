import { Action, ActionPanel, Form, Icon, Toast, showToast, open } from "@raycast/api";
import { useState } from "react";
import { sendMedia } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";
import { readFileSync } from "fs";

type Values = {
  instanceName: string;
  number: string;
  filePath: string[];
  caption?: string;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);

  if (isChecking) return <Form isLoading={true} />;
  if (!isValid) return <Form isLoading={false} />;

  async function handleSubmit(values: Values) {
    if (!values.filePath || values.filePath.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: "Please select a file" });
      return;
    }

    setIsLoading(true);
    try {
      const filePath = values.filePath[0];
      const fileBuffer = readFileSync(filePath);
      const fileName = filePath.split("/").pop() || "file";

      const formData = new FormData();
      formData.append("number", values.number);
      if (values.caption) formData.append("caption", values.caption);
      const blob = new Blob([fileBuffer]);
      formData.append("file", blob, fileName);

      await sendMedia(values.instanceName, formData);
      await showToast({ style: Toast.Style.Success, title: "Media sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send media";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send Media"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
          <Action
            title="Open File Picker"
            icon={Icon.Finder}
            onAction={() => open("/")}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="number" title="Recipient Number" placeholder="e.g. 55999999999" />
      <Form.FilePicker id="filePath" title="Media File" allowMultipleSelection={false} />
      <Form.TextField id="caption" title="Caption (optional)" placeholder="Media caption" />
      <Form.Description text="Select an image, video, audio, or document file to send" />
    </Form>
  );
}
