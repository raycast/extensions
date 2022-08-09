import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";
import { useState } from "react";

interface Preferences {
  avatarsApiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [name, setName] = useState("");

  function getUrl() {
    const baseUrl = "https://avatars.abstractapi.com/v1";
    const urlFriendlyName = encodeURIComponent(name);

    return `${baseUrl}/?api_key=${preferences.avatarsApiKey}&name=${urlFriendlyName}&image_format=png`;
  }

  async function submitAndOpen() {
    if (name == "") {
      showToast(Toast.Style.Failure, "Error", "Name is required");
      return;
    }

    open(getUrl());
  }

  async function submitAndDownload() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving avatar...",
    });

    await axios
      .get(getUrl(), { responseType: "stream" })
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
          <Action.SubmitForm title="Download" onSubmit={submitAndDownload} icon={Icon.Download} />
          <Action.SubmitForm title="Open in Browser" onSubmit={submitAndOpen} icon={Icon.Globe} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter name"
        onChange={(value) => setName(value)}
      />
    </Form>
  );
}
