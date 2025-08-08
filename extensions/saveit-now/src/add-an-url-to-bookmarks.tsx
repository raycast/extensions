import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { createBookmark, isValidUrl } from "./api";

interface FormValues {
  url: string;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    const { url } = values;

    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL Required",
        message: "Please enter a URL to save",
      });
      return;
    }

    if (!isValidUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid URL",
      });
      return;
    }

    await createBookmark(url);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        info="Enter the URL you want to save to SaveIt.now"
      />
    </Form>
  );
}
