import { Form, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { savePage, urlsToArray } from "./lib";

type Values = {
  urls: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      const urls = urlsToArray(values.urls);
      urls.forEach(async (url) => {
        await savePage(url);
      });

      showToast({ title: `${urls.length} URLs saved` });
      popToRoot();
    },
    validation: {
      urls: (value) => {
        console.log(value);
        if (value) {
          const urls = urlsToArray(value);
          if (urls.length !== value.split("\n").length) {
            return "Invalid URLs found";
          }
        } else {
          return "This field is required!";
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
