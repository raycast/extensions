import { ActionPanel, Icon, Form, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { appendToPage } from "../../utils/notion";
import { Page } from "../../utils/types";

export function AppendToPageForm(props: { page: Page; onContentUpdate?: (markdown: string) => void }): JSX.Element {
  const { page, onContentUpdate } = props;
  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    if (!values.content) {
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Adding content to the Page" });

    pop();

    const { markdown } = await appendToPage(page.id, { content: values.content });
    onContentUpdate?.(markdown);
  }

  const pageTitle = (page.icon_emoji ? page.icon_emoji + " " : "") + (page.title ? page.title : "Untitled");

  return (
    <Form
      navigationTitle={pageTitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Append Content" icon={Icon.Plus} onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={`Add to ${pageTitle}`} />
      <Form.TextArea id="content" title="Page Content" />
    </Form>
  );
}
