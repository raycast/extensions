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
  const [nameError, setNameError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function validate() {
    if (name.length == 0) {
      setNameError("This field is required!");

      return false;
    } else {
      dropNameErrorIfNeeded();
    }

    return true;
  }

  function getUrl() {
    const baseUrl = "https://avatars.abstractapi.com/v1";
    const urlFriendlyName = encodeURIComponent(name);
    return `${baseUrl}/?api_key=${preferences.avatarsApiKey}&name=${urlFriendlyName}&image_format=png`;
  }

  async function submitAndOpen() {
    if (validate()) {
      open(getUrl());
    }
  }

  async function submitAndDownload() {
    if (!validate()) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving avatar...",
    });

    await axios
      .get(getUrl(), { responseType: "stream" })
      .then((response) => {
        const filename = name.split(" ").join("_");
        response.data.pipe(fs.createWriteStream(`${homedir()}/Downloads/${filename}.png`));

        toast.style = Toast.Style.Success;
        toast.title = "Avatar saved to downloads";
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
        placeholder="John Doe"
        error={nameError}
        onChange={(value) => {
          setName(value);
          dropNameErrorIfNeeded();
        }}
      />
    </Form>
  );
}
