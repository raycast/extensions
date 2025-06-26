import { Action, ActionPanel, Form, type LaunchProps, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
};

export default function Command(
  props: LaunchProps<{
    draftValues: Values;
    arguments: Arguments.AskPerplexity;
  }>,
) {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query }) {
      const params = new URLSearchParams({
        q: query,
      });
      popToRoot();
      open(`perplexity-app://search?${params}`);
    },
    initialValues: {
      query: props.draftValues?.query ?? props.fallbackText ?? "",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

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
      <Form.Description text="Where knowledge begins" />
      <Form.TextArea title="Ask Anything" {...itemProps.query} />
    </Form>
  );
}
