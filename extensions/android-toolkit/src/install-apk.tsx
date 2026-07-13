import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { installApk } from "./utils/adb";
import { getErrorMessage } from "./utils/errors";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { files: string[]; userId: string }) {
    if (!values.files || values.files.length === 0) {
      showToast({
        title: "Error",
        message: "Please select an APK file",
        style: Toast.Style.Failure,
      });
      return;
    }

    const filePath = values.files[0];
    if (!filePath.endsWith(".apk")) {
      showToast({
        title: "Error",
        message: "Please select a valid .apk file",
        style: Toast.Style.Failure,
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      title: "Installing APK...",
      style: Toast.Style.Animated,
    });

    try {
      await installApk(filePath, values.userId);
      toast.style = Toast.Style.Success;
      toast.title = "APK Installed Successfully";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Install APK";
      toast.message = getErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Apk" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select APK File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
      <Form.TextField
        id="userId"
        title="User ID (Optional)"
        placeholder="e.g. 0 (leave empty for default user)"
      />
    </Form>
  );
}
