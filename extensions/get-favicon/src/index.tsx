import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  PopToRootType,
  showHUD,
  showInFinder,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import tempfile from "tempfile";
import path from "path";
import { nanoid } from "nanoid";
import { useState } from "react";
import isUrl from "is-url";

type Values = {
  url: string;
};

export default function Command() {
  const [error, setError] = useState<string>();
  const [url, setUrl] = useState("");

  async function handleCopy({ url }: Values) {
    if (!isUrl(url)) {
      setError("Invalid URL");
      return;
    }

    const toast = new Toast({
      title: "Copying favicon...",
      message: url,
      style: Toast.Style.Animated,
    });
    toast.show();

    const destination = tempfile(".png");
    const favicon = await getFavicon(url);

    await download.image({
      url: (favicon as any).source,
      dest: destination,
    });

    await Clipboard.copy({
      file: destination,
    });

    toast.title = "Favicon copied";
    toast.style = Toast.Style.Success;

    await showHUD("Favicon copied");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  }

  async function handleDownload({ url }: Values) {
    if (!isUrl(url)) {
      setError("Invalid URL");
      return;
    }

    const toast = new Toast({
      title: "Downloading favicon...",
      message: url,
      style: Toast.Style.Animated,
    });
    toast.show();

    const preferences = getPreferenceValues();

    const destination = path.join(preferences.downloadDirectory, `${nanoid()}.png`);
    const favicon = await getFavicon(url);

    await download.image({
      url: (favicon as any).source,
      dest: destination,
    });

    await Clipboard.copy({
      file: destination,
    });

    toast.title = "Favicon downloaded";
    toast.style = Toast.Style.Success;

    await showInFinder(destination);
    await showHUD("Favicon downloaded");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.CopyClipboard} title="Copy Image" onSubmit={handleCopy} />
          <Action.SubmitForm icon={Icon.Download} title="Download Image" onSubmit={handleDownload} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://raycast.com"
        error={error}
        value={url}
        onChange={(value) => {
          if (error && isUrl(value)) {
            setError("");
          }
          setUrl(value);
        }}
      />
    </Form>
  );
}
