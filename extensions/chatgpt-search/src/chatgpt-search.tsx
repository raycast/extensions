import { Action, ActionPanel, Form, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useChatGptSearch } from "./useChatGptSearch";
import { Props } from "./Props";
import { ExtensionPreferences } from "./ExtensionPreferences";

export default function Command(props: LaunchProps<{ arguments: Props }>) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { handleSubmit, itemProps } = useChatGptSearch(preferences);

  if (props.arguments.query) {
    handleSubmit({
      query: props.arguments.query,
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
      <Form.TextArea title="Search with ChatGPT..." {...itemProps.query} />
    </Form>
  );
}
