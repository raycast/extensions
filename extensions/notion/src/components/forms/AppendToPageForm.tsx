import { ActionPanel, Icon, Form, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { appendToPage, getPageName, Page } from "../../utils/notion";

export function AppendToPageForm(props: { page: Page; onContentUpdate?: () => void }) {
  const { page, onContentUpdate } = props;
  const { pop } = useNavigation();

  const pageTitle = getPageName(page);

  const { handleSubmit, itemProps } = useForm<{ content: string }>({
    async onSubmit(values) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding content to the page", message: pageTitle });

        pop();

        await appendToPage(page.id, { content: values.content });
        onContentUpdate?.();

        await showToast({ style: Toast.Style.Success, title: "Added content to the page", message: pageTitle });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed adding content to the page", message: pageTitle });
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={pageTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Append Content" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Add to ${pageTitle}`} />
      <Form.TextArea title="Page Content" {...itemProps.content} enableMarkdown />
    </Form>
  );
}
