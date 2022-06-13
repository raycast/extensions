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

    await axios
      .post(
        "https://api.m3o.com/v1/avatar/Generate",
        {
          format: values.format,
          gender: values.gender,
          upload: true, // this is so the API returns a URL to the generated avatar
          username: values.username,
        },
        {
          headers: { Authorization: `Bearer ${preferences.apiKey}` },
        }
      )
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Avatar retrieved successfully";
        toast.primaryAction = {
          title: "Download Image",
          onAction: async (toast) => {
            toast.style = Toast.Style.Animated;
            toast.title = "Saving avatar";

            await axios
              .get(response.data.url, { responseType: "stream" })
              .then((response) => {
                const filename = values.username ? values.username.split(" ").join("_") : "avatar";
                const type = values.format === "png" ? "png" : "jpeg";
                response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${filename}.${type}`));

                toast.style = Toast.Style.Success;
                toast.title = "Avatar saved successfully";
              })
              .catch((error) => {
                toast.style = Toast.Style.Failure;
                toast.title = "Unable to download avatar";
                toast.message = error.response.data.error.message ?? "";
              });
          },
        };
        toast.secondaryAction = {
          title: "Copy URL",
          onAction: async (toast) => {
            await Clipboard.copy(response.data.url);

            toast.title = "Copied to clipboard";
            toast.secondaryAction = undefined;
          },
        };
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve avatar";
        toast.message = error.response.data.detail ?? "";
      });
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

      <Form.TextField id="username" title="Username" placeholder="Enter username" />
    </Form>
  );
}
