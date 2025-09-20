import { Form, ActionPanel, Action, showToast, Toast, useNavigation, showHUD } from "@raycast/api";
import {
  addLeadingTimeToContentIfNecessary,
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

  async function handleSubmit(values: CommandForm): Promise<boolean> {
    if (!values.content) {
      showToast({
        style: Toast.Style.Failure,
        title: "🐝 Type something to get started",
      });
      return false;
    }

    const content = addLeadingTimeToContentIfNecessary(values.content);

    validateUserConfigGraphPath()
      .catch((e) => {
        showGraphPathInvalidToast();
        throw e;
      })
      .then(() => showToast({ style: Toast.Style.Animated, title: "Adding notes" }))
      .then(getTodayJournalPath)
      .then((filePath) => appendContentToFile(content, filePath))
      .then(() => showHUD("✅ Note added"))
      .then(pop)
      .catch((e) => showToast({ style: Toast.Style.Failure, title: "Failed", message: e }))
      .catch(noop);

    return true;
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
