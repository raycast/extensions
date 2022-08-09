import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";
import { useState } from "react";
import { extractHostname } from "./utils";

interface Preferences {
  screenshotApiKey: string;
}

interface CommandForm {
  websiteUrl: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [url, setUrl] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.websiteUrl == "") {
      showToast(Toast.Style.Failure, "Error", "IP address is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving screenshot...",
    });

    const baseUrl = "https://screenshot.abstractapi.com/v1";
    const formUrl = encodeURIComponent(values.websiteUrl);
    const url = `${baseUrl}/?api_key=${preferences.screenshotApiKey}&url=${formUrl}`;

    axios
      .get(url)
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Screenshot retrieved successfully";

        setWebsiteUrl(values.websiteUrl);
        setUrl(url);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve screenshot";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  async function download() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving screenshot...",
    });

    await axios
      .get(url, { responseType: "stream" })
      .then((response) => {
        const hostname = extractHostname(websiteUrl);
        response.data.pipe(fs.createWriteStream(`${homedir()}/Downloads/${hostname}.png`));

        toast.style = Toast.Style.Success;
        toast.title = "Screenshot saved to downloads successfully";
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve screenshot";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Screenshot" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url ? (
            <>
              <Action title="Download" onAction={download} icon={Icon.Download} />
              <Action.OpenInBrowser title="Open in Browser" url={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="websiteUrl" title="Website URL" placeholder="Enter website URL" />
    </Form>
  );
}
