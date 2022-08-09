import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";
import { useState } from "react";

interface Preferences {
  avatarsApiKey: string;
}

interface CommandForm {
  name: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.name == "") {
      showToast(Toast.Style.Failure, "Error", "Name is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving avatar...",
    });

    const baseUrl = "https://avatars.abstractapi.com/v1";
    const name = encodeURIComponent(values.name);
    const url = `${baseUrl}/?api_key=${preferences.avatarsApiKey}&name=${name}&image_format=png`;

    axios
      .get(url)
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Avatar retrieved successfully";

        setName(name);
        setUrl(url);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve avatar";
        toast.message = error.response.data.error.message ?? "";
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
        const filename = name.split(" ").join("_");
        response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${filename}.png`));

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
          {url ? (
            <>
              <Action title="Download" onAction={download} icon={Icon.Download} />
              <Action.OpenInBrowser title="Open in Browser" url={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" />
    </Form>
  );
}
