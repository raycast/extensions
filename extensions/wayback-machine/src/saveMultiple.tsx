import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { savePage, urlRegex } from "./lib";

type Values = {
  urls: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    let urls = values.urls.split("\n");
    // remove empty lines
    urls = urls.filter((url) => url !== "");
    // validate each url by urlRegex and remove invalid urls
    urls = urls.filter((url) => urlRegex.test(url));

    if (urls.length !== values.urls.split("\n").length) {
      showToast({ style: Toast.Style.Failure, title: "Some URLs are invalid" });

      return;
    }

    urls.forEach(async (url) => await savePage(url));

    showToast({ title: `${urls.length} URLs saved` });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="urls" title="URLs" placeholder="Enter one URL per line" />
    </Form>
  );
}
