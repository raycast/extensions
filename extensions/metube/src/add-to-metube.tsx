import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { addToQueue } from "./helper.js";
import { showFailureToast } from "@raycast/utils";

type Values = {
  url: string;
  quality: string;
  format: string;
};

interface Preferences {
  metubeUrl: string;
  quality: string;
  format: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const quality = preferences.quality;
  const format = preferences.format;

  async function handleSubmit(values: Values) {
    if (!values.url) {
      showFailureToast("Provide link to download", { title: "Required data missing:" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending link to MeTube...",
    });

    try {
      const response = await addToQueue(values.url, values.quality, values.format);
      if (response.status === "ok") {
        toast.style = Toast.Style.Success;
        toast.title = "Link sent to MeTube";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "MeTube returned error";
        toast.message = response.msg;
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sending link failed";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="Link" placeholder="Enter link" />
      <Form.Separator />
      <Form.Dropdown id="quality" title="Quality" defaultValue={quality}>
        <Form.Dropdown.Item value="best" title="Best" />
        <Form.Dropdown.Item value="1440" title="1440p" />
        <Form.Dropdown.Item value="1080" title="1080p" />
        <Form.Dropdown.Item value="720" title="720p" />
        <Form.Dropdown.Item value="480" title="480p" />
      </Form.Dropdown>
      <Form.Dropdown id="format" title="Format" defaultValue={format}>
        <Form.Dropdown.Item value="any" title="Any" />
        <Form.Dropdown.Item value="mp4" title="MP4" />
        <Form.Dropdown.Item value="m4a" title="M4A" />
        <Form.Dropdown.Item value="mp3" title="MP3" />
        <Form.Dropdown.Item value="wav" title="WAV" />
        <Form.Dropdown.Item value="flac" title="FLAC" />
        <Form.Dropdown.Item value="thumbnail" title="Thumbnail" />
      </Form.Dropdown>
    </Form>
  );
}
