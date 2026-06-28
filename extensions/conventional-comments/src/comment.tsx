import {
  Form,
  FormValue,
  ActionPanel,
  SubmitFormAction,
  pasteText,
  Icon,
  closeMainWindow,
  OpenInBrowserAction,
  showHUD,
} from "@raycast/api";

export default function Command() {
  async function handleSubmit(values: Record<string, FormValue>) {
    const { label, subject, content } = values;
    const body = `**${label}**: ${subject}\n${content}`;
    await pasteText(body);
    await showHUD("Comment pasted to foremost app");
    await closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction icon={Icon.Clipboard} title="Paste" onSubmit={handleSubmit} />
          <OpenInBrowserAction title="Open Reference Website" url="https://conventionalcomments.org/" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="label" title="Label">
        <Form.DropdownItem value="suggestion" title="Suggestion" />
        <Form.DropdownItem value="question" title="Question" />
        <Form.DropdownItem value="praise" title="Praise" />
        <Form.DropdownItem value="nitpick" title="Nitpick" />
        <Form.DropdownItem value="issue" title="Issue" />
        <Form.DropdownItem value="thought" title="Thought" />
        <Form.DropdownItem value="chore" title="Chore" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="subject" title="Subject" placeholder="Title of your comment" />
      <Form.TextArea id="content" title="Content" placeholder="Content of your comment" />
    </Form>
  );
}
