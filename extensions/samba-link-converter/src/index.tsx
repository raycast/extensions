import { ActionPanel, Action, Form, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  windowsLink: string;
  namespace: string;
  returnRootPath: boolean;
}

export default function Command() {
  const [macLink, setMacLink] = useState<string>("");

  function convertToMacLink(values: FormValues): string {
    const parts = values.windowsLink.replace(/^\\+/, "").split("\\");
    const shareName = parts.shift();
    const baseUrl = `smb://${shareName}.${values.namespace}`;
    const path = parts.join("/");

    if (values.returnRootPath) {
      const rootPath = path.split("/")[0];
      return rootPath ? `${baseUrl}/${rootPath}` : baseUrl;
    }

    return `${baseUrl}/${path}`;
  }

  function handleSubmit(values: FormValues) {
    try {
      const convertedLink = convertToMacLink(values);
      setMacLink(convertedLink);

      showToast({
        style: Toast.Style.Success,
        title: "Conversion successful",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: "Please check your input and try again",
      });
    }
  }

  async function copyToClipboard() {
    if (macLink) {
      await Clipboard.copy(macLink);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: "Mac link has been copied",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Link" onSubmit={handleSubmit} />
          {macLink && (
            <>
              <Action.Open
                title="Open in Finder"
                target={macLink}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Copy to Clipboard"
                onAction={copyToClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="windowsLink"
        title="Windows Samba Link"
        placeholder="\\share1\folder\folder2"
      />
      <Form.TextField
        id="namespace"
        title="Namespace"
        placeholder="namespace.ns"
        storeValue
      />
      <Form.Checkbox
        id="returnRootPath"
        label="Return Root Path Only"
        info="This is useful because macOS mounts the subfolder link you provide it and doesn't provide an easy way to go up the file tree in a share folder"
        storeValue
      />
      {macLink && (
        <Form.Description
          title="Converted Mac Link"
          text={macLink}
        />
      )}
    </Form>
  );
}