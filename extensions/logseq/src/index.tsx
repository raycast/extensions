import { Form, ActionPanel, Action, showToast, Toast, useNavigation, showHUD } from "@raycast/api";
import {
  appendContentToFile,
  getTodayJournalPath,
  noop,
  showGraphPathInvalidToast,
  validateUserConfigGraphPath,
} from "./utils";

interface CommandForm {
  content: string;
}

export default function Command() {
  const { pop } = useNavigation();

  async function handleSubmit(values: CommandForm) {
    if (!values.content) {
      return showToast({
        style: Toast.Style.Failure,
        title: "🐝 Type something to get started",
      });
    }
    validateUserConfigGraphPath()
      .catch((e) => {
        showGraphPathInvalidToast();
        throw e;
      })
      .then(() => showToast({ style: Toast.Style.Animated, title: "Adding notes" }))
      .then(getTodayJournalPath)
      .then((filePath) => appendContentToFile(values.content, filePath))
      .then(() => showHUD("✅ Note added"))
      .then(pop)
      .catch((e) => showToast({ style: Toast.Style.Failure, title: "Failed", message: e }))
      .catch(noop);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add quick notes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter notes" />
    </Form>
  );
}
