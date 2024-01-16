import { Form, ActionPanel, Action, showToast, showHUD, popToRoot, Toast, Clipboard } from "@raycast/api";
import { createHash } from "node:crypto";

interface CommandForm {
  userInput: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    const { userInput } = values;

    if (userInput.length === 0) {
      await showToast(Toast.Style.Failure, "Empty string!");
      return;
    }
    try {
      const md5 = createHash("md5").update(values.userInput).digest("hex");
      await Clipboard.copy(md5);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Invalid input");
      return;
    }

    await showHUD("Copied to clipboard");
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Generate" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="userInput"
        title="String"
        autoFocus={true}
        placeholder="Enter the string to create the md5 hash"
      />
    </Form>
  );
}
