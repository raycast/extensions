import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import { openUrlWithVelja, removeTrackingParameters } from "../lib/url-actions";

type FormValues = {
  url: string;
  openAfterCleaning: boolean;
};

export default function Command() {
  async function handleSubmit(values: FormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Cleaning URL..." });

    try {
      if (!values.url.trim()) {
        throw new Error("URL is required");
      }

      const cleanedUrl = removeTrackingParameters(values.url);
      await Clipboard.copy(cleanedUrl);

      if (values.openAfterCleaning) {
        openUrlWithVelja(cleanedUrl);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Clean URL copied to clipboard",
        message: cleanedUrl,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not clean URL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Remove Tracking Parameters" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com?utm_source=newsletter" />
      <Form.Checkbox id="openAfterCleaning" label="Open cleaned URL after processing" />
    </Form>
  );
}
