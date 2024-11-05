import { Action, ActionPanel, Form, LaunchProps, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
};

interface SearchArguments {
  query?: string;
}

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: SearchArguments }>) {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query }) {
      const params = new URLSearchParams({
        q: query,
      });
      popToRoot();
      open(`https://chatgpt.com/?hints=search&q=${params.get("q")}`);
    },
    initialValues: {
      query: props.draftValues?.query ?? props.fallbackText ?? "",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  // Handle direct query from command bar
  if (props.arguments.query) {
    handleSubmit({
      query: props.arguments.query,
    });
    return null;
  }

  if (props.fallbackText) {
    handleSubmit({
      query: props.fallbackText,
    });
    return null;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Search ChatGPT" />
      <Form.TextArea title="Ask ChatGPT..." {...itemProps.query} />
    </Form>
  );
}
