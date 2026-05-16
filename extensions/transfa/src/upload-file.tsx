import { Action, ActionPanel, Clipboard, Form, Icon, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { useState } from "react";
import { uploadFile } from "./api";
import { formatBytes } from "./utils";

interface FormValues {
  files: string[];
  ttl: string;
  password: string;
}

export default function UploadFileCommand() {
  const { apiKey, defaultTtl } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.files?.length) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a file first" });
      return;
    }

    const filePath = values.files[0];
    const filename = path.basename(filePath);
    const size = fs.statSync(filePath).size;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading…",
      message: `${filename} · ${formatBytes(size)}`,
    });

    try {
      const result = await uploadFile(filePath, {
        ttl: values.ttl || undefined,
        password: values.password || undefined,
        apiKey: apiKey || undefined,
      });

      await Clipboard.copy(result.url);

      toast.style = Toast.Style.Success;
      toast.title = "Link copied!";
      toast.message = result.url;
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => open(result.url),
      };
      toast.secondaryAction = {
        title: "Copy Direct Download URL",
        onAction: () => Clipboard.copy(result.agent_link),
      };
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      toast.message = String(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload & Copy Link" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="File" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.Dropdown id="ttl" title="Expires" defaultValue={defaultTtl || "7d"}>
        <Form.Dropdown.Item value="1h" title="1 hour" />
        <Form.Dropdown.Item value="24h" title="24 hours" />
        <Form.Dropdown.Item value="7d" title="7 days" />
        <Form.Dropdown.Item value="30d" title="30 days" />
      </Form.Dropdown>
      <Form.PasswordField id="password" title="Password" placeholder="Optional — protect the link" />
      <Form.Description
        title=""
        text={
          apiKey
            ? "Uploading with your API key."
            : "Guest mode — 10 MB max, 24h TTL. Add an API key in preferences for higher limits."
        }
      />
    </Form>
  );
}
