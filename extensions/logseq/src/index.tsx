import { Form, ActionPanel, Action, showToast, Toast, useNavigation, showHUD } from "@raycast/api";
import fs from "fs";
import {
  createFileIfNotExist,
  generateContentToAppend,
  getTodayJournalPath,
  noop,
  validateUerConfigGraphPath,
} from "./utils";

interface CommandForm {
  content: string;
}

export default function Command() {
  const { pop } = useNavigation();

  async function handleSubmit(values: CommandForm) {
    const filePath = getTodayJournalPath();

    validateUerConfigGraphPath()
      .catch((e) => {
        showToast({ style: Toast.Style.Failure, title: "The path of logseq graph is invalid, please check and retry later." })
        throw e
      })
      .then(() => showToast({ style: Toast.Style.Animated, title: "Adding notes" }))
      .then(() => createFileIfNotExist(filePath))
      .then(() => fs.promises.appendFile(filePath, generateContentToAppend(values.content)))
      .then(() => showHUD("✅ Notes added"))
      .then(pop)
      .catch((e) => showToast({ style: Toast.Style.Failure, title: "Failed", message: e }))
      .catch(noop)
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
