import { Action, ActionPanel, Form, getPreferenceValues, LaunchProps, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
};

const BROWSER_SEARCH_URL = "https://www.perplexity.ai/search";
const APP_SEARCH_URL = "perplexity-app://search";

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: Arguments.AskPerplexity }>) {
  const shouldUseApp = getPreferenceValues<Preferences.AskPerplexity>().perplexityApp;
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query }) {
      const params = new URLSearchParams({
        q: query,
      });
      popToRoot();
      open(`${shouldUseApp ? APP_SEARCH_URL : BROWSER_SEARCH_URL}?${params}`);
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
      <Form.TextArea title="Ask Anything" {...itemProps.query} />
    </Form>
  );
}
