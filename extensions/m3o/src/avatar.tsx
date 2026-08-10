import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
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
  const [url, setUrl] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();

  function dropUsernameErrorIfNeeded() {
    if (usernameError && usernameError.length > 0) {
      setUsernameError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.username == "") {
      setUsernameError("This field is required!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving avatar...",
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
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }
      )
      .then(async (response) => {
        toast.style = Toast.Style.Success;

        setUrl(response.data.url);

        await axios
          .get(response.data.url, { responseType: "stream" })
          .then((response) => {
            const filename = values.username ? values.username.split(" ").join("_") : "avatar";
            const type = values.format === "png" ? "png" : "jpeg";
            response.data.pipe(fs.createWriteStream(`${homedir()}/Downloads/${filename}.${type}`));

            toast.style = Toast.Style.Success;
            toast.title = "Avatar saved to downloads";
          })
          .catch((error) => {
            toast.style = Toast.Style.Failure;
            toast.title = "Unable to download avatar";
            toast.message = error.response.data.error.message ?? "";
          });
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to download avatar";
        toast.message = error.response.data.detail ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url && <Action.OpenInBrowser title="Open in Browser" url={url} />}
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

      <Form.TextField
        id="username"
        title="Username"
        placeholder="Enter username"
        error={usernameError}
        onChange={dropUsernameErrorIfNeeded}
      />
    </Form>
  );
}
