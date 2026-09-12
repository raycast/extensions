import { Form, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { savePage, extractUrls } from "./lib";

type Values = {
  urls: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      const urls = extractUrls(values.urls, 0);
      urls.forEach(async (url: string) => {
        await savePage(url);
      });

      showToast({ title: `${urls.length} URLs saved` });
      popToRoot();
    },
    validation: {
      urls: (value) => {
        if (!value) {
          return "This field is required!";
        }
        const urls = extractUrls(value, 0);
        if (urls.length === 0) {
          return "No valid URLs found in the provided text";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.urls} title="URLs" placeholder="Enter one URL per line" />
    </Form>
  );
}
