import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { commitTypes, formFields } from "./data";
import Documentation from "./documentation";
import { CommitValues, Keys } from "./types";

export default function Command() {
  async function handleSubmit({ type, scope, subject, body, footer, paste }: CommitValues & { paste: boolean }) {
    if (!subject) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Subject is required",
      });
      return;
    }

    let commitMessage = `${type}`;

    if (scope) {
      commitMessage += `(${scope})`;
    }

    commitMessage += ": ";

    if (subject) {
      commitMessage += subject;
    }

    if (body) {
      commitMessage += `\n\n${body}`;
    }

    if (footer) {
      commitMessage += `\n\n${footer}`;
    }

    await Clipboard.copy(commitMessage);

    if (paste) {
      await Clipboard.paste(commitMessage);
    }

    closeMainWindow();
    popToRoot({ clearSearchBar: true });
    showHUD("Copied to Clipboard");
  }

  const { body, footer, scope, subject, type } = formFields;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleSubmit} />
          <Action.Push title="Open Documentation" target={<Documentation />} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title={type.title} defaultValue="feat">
        {Object.keys(commitTypes).map((key) => (
          <Form.Dropdown.Item value={key} title={commitTypes[key as Keys].title} key={key} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="scope" title={scope.title} placeholder={scope.description} />
      <Form.TextField id="subject" title={subject.title} placeholder={subject.description} />
      <Form.TextArea id="body" title={body.title} placeholder={body.description} />
      <Form.TextField id="footer" title={footer.title} placeholder={footer.description} />
      <Form.Checkbox id="paste" label="Paste text to the most frontmost application" storeValue />
      <Form.Description title="Hint" text="Press `⌘ ⇧ ↵` to open documentation" />
    </Form>
  );
}
