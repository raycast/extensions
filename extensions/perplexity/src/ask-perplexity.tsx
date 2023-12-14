import { Action, ActionPanel, Form, LaunchProps, getPreferenceValues, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
  copilot: boolean;
  focus: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: Arguments.AskPerplexity }>) {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query, copilot, focus }) {
      const params = new URLSearchParams({
        q: query,
        copilot: copilot.toString(),
        focus,
      });
      popToRoot();
      open(`https://www.perplexity.ai/search?${params}`);
    },
    initialValues: {
      query: props.draftValues?.query ?? props.fallbackText ?? "",
      copilot: props.draftValues?.copilot ?? false,
      focus: props.draftValues?.focus ?? "all",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  if (props.arguments.query) {
    handleSubmit({
      query: props.arguments.query,
      copilot: ["y", "yes", "true"].includes(props.arguments.copilot?.toLowerCase() ?? ""),
      focus: "all",
    });
    return null;
  }

  if (props.fallbackText) {
    handleSubmit({
      copilot: getPreferenceValues<Preferences.AskPerplexity>().fallbackCopilot,
      query: props.fallbackText,
      focus: "all",
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
      <Form.Dropdown
        title="Focus"
        info="Focus allows you to fine tune your search by narrowing down the sources, for more targeted and relevant results. All follow-up questions in this Thread will focus the search on your chosen domain."
        {...itemProps.focus}
      >
        <Form.Dropdown.Item value="all" title="All" />
        <Form.Dropdown.Item value="scholar" title="Academic" />
        <Form.Dropdown.Item value="writing" title="Writing" />
        <Form.Dropdown.Item value="wolfram" title="Wolfram Alpha" />
        <Form.Dropdown.Item value="youtube" title="Youtube" />
        <Form.Dropdown.Item value="reddit" title="Reddit" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        label="Copilot"
        storeValue
        {...itemProps.copilot}
        // force this to be an uncontrolled input
        // so the stored value is respected
        // https://github.com/raycast/utils/issues/19
        value={undefined}
      />
    </Form>
  );
}
