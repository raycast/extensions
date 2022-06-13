import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";
import fs from "fs";
import { homedir } from "os";
import { extractHostname } from "./utils";

interface Preferences {
  scrapeApiKey: string;
}

interface CommandForm {
  url: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.url == "") {
      showToast(Toast.Style.Failure, "Error", "URL is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving scrape...",
    });

    const baseUrl = "https://scrape.abstractapi.com/v1";
    const formUrl = encodeURIComponent(values.url);
    const url = `${baseUrl}/?api_key=${preferences.scrapeApiKey}&url=${formUrl}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Scrape retrieved successfully";
        toast.message = "Hover over the toast to see available actions";
        toast.primaryAction = {
          title: "Open in Browser",
          onAction: (toast) => {
            open(url);

            toast.hide();
          },
        };
        toast.secondaryAction = {
          title: "Download",
          onAction: async (toast) => {
            toast.style = Toast.Style.Animated;
            toast.title = "Saving scrape";

            await axios
              .get(url, { responseType: "stream" })
              .then((response) => {
                const hostname = extractHostname(values.url);
                response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${hostname}.html`));

                toast.style = Toast.Style.Success;
                toast.title = "Scrape saved successfully";
              })
              .catch((error) => {
                toast.style = Toast.Style.Failure;
                toast.title = "Unable to retrieve scrape";
                toast.message = error.response.data.error.message ?? "";
              });
          },
        };

        setOutput(JSON.stringify(response.data));
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve scrape";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scrape" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter url" />
      {output ? (
        <>
          <Form.Separator />
          {/* spacer */}
          <Form.Description text="" />
          <Form.TextArea id="output" title="Output" value={output} />
        </>
      ) : null}
    </Form>
  );
}
