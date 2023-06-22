import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";
import { useState } from "react";
import { extractHostname } from "./utils";

interface Preferences {
  screenshotApiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteUrlError, setWebsiteUrlError] = useState<string | undefined>();

  function dropWebsiteUrlErrorIfNeeded() {
    if (websiteUrlError && websiteUrlError.length > 0) {
      setWebsiteUrlError(undefined);
    }
  }

  function validate() {
    if (websiteUrl.length == 0) {
      setWebsiteUrlError("This field is required!");

      return false;
    } else {
      dropWebsiteUrlErrorIfNeeded();
    }

    return true;
  }

  function getUrl() {
    const baseUrl = "https://screenshot.abstractapi.com/v1";
    const formUrl = encodeURIComponent(websiteUrl);
    return `${baseUrl}/?api_key=${preferences.screenshotApiKey}&url=${formUrl}`;
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
      title: "Saving screenshot...",
    });

    await axios
      .get(getUrl(), { responseType: "stream" })
      .then((response) => {
        const hostname = extractHostname(websiteUrl);
        response.data.pipe(fs.createWriteStream(`${homedir()}/Downloads/${hostname}.png`));

        toast.style = Toast.Style.Success;
        toast.title = "Screenshot saved to downloads";
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to download screenshot";
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
        id="websiteUrl"
        title="Website URL"
        placeholder="https://raycast.com"
        error={websiteUrlError}
        onChange={(value) => {
          setWebsiteUrl(value);
          dropWebsiteUrlErrorIfNeeded();
        }}
      />
    </Form>
  );
}
