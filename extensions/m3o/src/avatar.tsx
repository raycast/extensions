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
  const [username, setUsername] = useState("");
  const [format, setFormat] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();

  function dropUsernameErrorIfNeeded() {
    if (usernameError && usernameError.length > 0) {
      setUsernameError(undefined);
    }
  }

  function validate() {
    if (username.length == 0) {
      setUsernameError("The field is required!");

      return false;
    } else {
      dropUsernameErrorIfNeeded();
    }

    return true;
  }

  async function handleSubmit(values: CommandForm) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving avatar...",
    });

    const data = {
      format: values.format,
      gender: values.gender,
      upload: true, // this is so the API returns a URL to the generated avatar
      username: values.username,
    };

    const options = {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    };

    await axios
      .post("https://api.m3o.com/v1/avatar/Generate", data, options)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Avatar retrieved successfully";

        setUsername(values.username);
        setFormat(values.format);
        setUrl(response.data.url);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve avatar";
        toast.message = error.response.data.detail ?? "";
      });
  }

  async function download() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving avatar...",
    });

    await axios
      .get(url, { responseType: "stream" })
      .then((response) => {
        const filename = username ? username.split(" ").join("_") : "avatar";
        const type = format === "png" ? "png" : "jpeg";
        response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${filename}.${type}`));

        toast.style = Toast.Style.Success;
        toast.title = "Avatar saved successfully";
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to download avatar";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Avatar" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url && (
            <>
              <Action title="Download" onAction={download} icon={Icon.Download} />
              <Action.OpenInBrowser title="Open in Browser" url={url} />
            </>
          )}
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
