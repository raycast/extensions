import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { openUrlWithVelja } from "../lib/url-actions";

type FormValues = {
  url: string;
};

export default function Command() {
  async function handleSubmit(values: FormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Opening URL..." });

    try {
      if (!values.url.trim()) {
        throw new Error("URL is required");
      }

      openUrlWithVelja(values.url);
      await showToast({ style: Toast.Style.Success, title: "Opened URL with Velja" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open URL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open URL with Velja" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
    </Form>
  );
}
