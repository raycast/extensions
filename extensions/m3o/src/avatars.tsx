import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";

interface Preferences {
  apiKey: string;
}

interface CommandForm {
  format: string;
  gender: string;
  upload: string;
  username: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: CommandForm) {
    if (values.format == "") {
      showToast(Toast.Style.Failure, "Error", "Name is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving avatar...",
    });

    try {
      const { data } = await axios.post('https://api.m3o.com/v1/avatar/Generate', {
        format: values.format,
        gender: values.gender,
        upload: values.upload,
        username: values.username,
      }, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Avatar retrieved successfully";
      toast.primaryAction = {
        title: "Copy Base64",
        onAction: async (toast) => {
          await Clipboard.copy(data.base64);

          toast.title = "Copied to clipboard";
          toast.primaryAction = undefined;
        },
      };
      if (values.upload === "true") {
        toast.secondaryAction = {
          title: "Copy URL",
          onAction: async (toast) => {
            await Clipboard.copy(data.url);

            toast.title = "Copied to clipboard";
            toast.secondaryAction = undefined;
          },
        };
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve avatar";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Avatar" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Select format" defaultValue="jpeg">
        <Form.Dropdown.Item value="jpeg" title="JPEG" />
        <Form.Dropdown.Item value="png" title="PNG" />
      </Form.Dropdown>
      <Form.Dropdown id="gender" title="Select gender" defaultValue="male">
        <Form.Dropdown.Item value="male" title="Male" />
        <Form.Dropdown.Item value="female" title="Female" />
      </Form.Dropdown>
      <Form.Dropdown id="upload" title="Select type" defaultValue="false">
        <Form.Dropdown.Item value="false" title="Base64" />
        <Form.Dropdown.Item value="true" title="URL" />
      </Form.Dropdown>
      <Form.TextField id="username" title="Username" placeholder="Enter username" />
    </Form>
  );
}
