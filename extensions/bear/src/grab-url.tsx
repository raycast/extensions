import { ActionPanel, Form, Icon, popToRoot, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import open from "open";

interface FormValues {
  url: string;
  tags: string;
  pin: boolean;
}

function GrabUrlAction() {
  async function handleSubmit({ url, tags, pin }: FormValues) {
    if (!url) {
      showToast(ToastStyle.Failure, "URL is required");
      return;
    }
    open(
      `bear://x-callback-url/grab-url?url=${encodeURIComponent(url)}&tags=${encodeURIComponent(tags)}&pin=${
        pin ? "yes" : "no"
      }`
    );

    await popToRoot({ clearSearchBar: true });
  }

  return <SubmitFormAction icon={Icon.Globe} title="Capture in New Note" onSubmit={handleSubmit} />;
}

export default function GrabUrl() {
  return (
    <Form
      navigationTitle="Grab URL"
      actions={
        <ActionPanel>
          <GrabUrlAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="URL of web page to capture (eg. http://raycast.com)" />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated,tags" />
      <Form.Checkbox id="pin" label="Pin note to top of note list" />
    </Form>
  );
}
