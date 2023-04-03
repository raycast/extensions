import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { isValidUrl } from "../utils/url";
import { exec } from "child_process";
import path from "path";
import { useState } from "react";

type TShortenerPath = {
  netlifyshortener: string;
};

type TData = {
  url: string;
};

export default function Command() {
  const [url, setUrl] = useState<string>("");
  const preferences = getPreferenceValues<TShortenerPath>();

  const netlifyShortenerPath = path.join(preferences.netlifyshortener, "/node_modules/netlify-shortener/dist/index.js");

  const handleShortener = async (values: TData) => {
    if (!isValidUrl(values.url)) {
      await showToast({
        title: "Error",
        message: "Invalid url",
        style: Toast.Style.Failure,
      });
      return;
    }

    exec(`node ${netlifyShortenerPath} ${values.url}`, async (error, stdout, stderr) => {
      if (error) {
        await showToast({
          title: "Error",
          message: error.message,
          style: Toast.Style.Failure,
        });
        return;
      }
      if (stderr) {
        await showToast({
          title: "Error",
          message: stderr,
          style: Toast.Style.Failure,
        });
        return;
      }

      await Clipboard.copy(stdout);
      await showToast({
        title: "Success",
        message: "Shortened url copied to clipboard",
        style: Toast.Style.Success,
      });
    });
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten" onSubmit={(values: TData) => handleShortener(values)} />
          <Action title="Change Directory" onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="url" defaultValue={url} title="Url" placeholder="Type your url" onChange={(e) => setUrl(e)} />
    </Form>
  );
}
