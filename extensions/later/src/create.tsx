import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { expression } from "./utils/scripts";
import { add_link_handler } from "./utils/handler";
import { useForm } from "@raycast/utils";
import { FormValue } from "./types/validate";
const create = () => {
  const regex = new RegExp(expression);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValue>({
    onSubmit: async (values) => {
      const formattedURL = values.url.trim();
      const formattedTitle = values.title.trim();
      await add_link_handler(formattedURL, formattedTitle);

      pop();
    },
    validation: {
      title: (value) => {
        if (value?.trim()?.length === 0) {
          return "Title is required";
        }
      },
      url: (value) => {
        if (!value?.trim()?.match(regex)) {
          return "Invalid URL";
        } else if (!value?.trim()) {
          return "URL is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextField title="URL" {...itemProps.url} />
    </Form>
  );
};

export default create;
