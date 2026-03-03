import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

interface FormValues {
  thought: string;
}

export default function Command() {
  function handleSubmit(values: FormValues) {
    const { vaultPath, dailyNotePath } =
      getPreferenceValues<Preferences.Capture>();

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const dirPath = join(vaultPath, dailyNotePath);
    const filePath = join(dirPath, `${date}.md`);

    try {
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }

      const entry = `**${time}** - ${values.thought}\n`;

      if (!existsSync(filePath)) {
        appendFileSync(filePath, `# ${date}\n\n${entry}`);
      } else {
        appendFileSync(filePath, entry);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Captured",
        message: values.thought,
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Thought" onSubmit={handleSubmit} />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="thought"
        title="Thought"
        placeholder="What's on your mind?"
        autoFocus
      />
    </Form>
  );
}
