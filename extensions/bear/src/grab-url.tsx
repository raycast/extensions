import { ActionPanel, Action, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import open from "open";

interface FormValues {
  url: string;
  tags: string;
  pin: boolean;
}

function GrabUrlAction() {
  async function handleSubmit({ url, tags, pin }: FormValues) {
    if (!url) {
      showToast(Toast.Style.Failure, "URL is required");
      return;
    }
    open(
      `bear://x-callback-url/grab-url?url=${encodeURIComponent(url)}&tags=${encodeURIComponent(tags)}&pin=${
        pin ? "yes" : "no"
      }`,
    );

    await popToRoot({ clearSearchBar: true });
  }

  return <Action.SubmitForm icon={Icon.Globe} title="Capture in New Note" onSubmit={handleSubmit} />;
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
      <Form.TextField id="url" title="URL" placeholder="URL of web page to capture (eg. https://raycast.com)" />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated,tags" />
      <Form.Checkbox id="pin" label="Pin note to top of note list" />
    </Form>
  );
}
