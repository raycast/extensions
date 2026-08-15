import { Action, ActionPanel, Clipboard, Form, showHUD, showToast, Toast } from "@raycast/api";
import { createSecret, formatDuration, parseDuration } from "./shared";

const DEFAULT_DURATION_SECONDS = 3600;

interface FormValues {
  secret: string;
  duration: string;
  selfDestruct: boolean;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    if (!values.secret.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
      return;
    }

    const durationSeconds = parseDuration(values.duration) ?? DEFAULT_DURATION_SECONDS;

    await showToast({ style: Toast.Style.Animated, title: "Creating secret..." });

    try {
      const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
      const shareUrl = await createSecret(values.secret, expirationTimestamp, values.selfDestruct);
      await Clipboard.copy(shareUrl);

      const durationDisplay = formatDuration(durationSeconds);
      const destructNote = values.selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";

      await showHUD(`Copied! Expires in ${durationDisplay}. ${destructNote}`);
    } catch (error) {
      console.error("Failed to create secret:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret" placeholder="Enter your secret (password, API key, note...)" />
      <Form.Dropdown id="duration" title="Expires in" defaultValue="1h">
        <Form.Dropdown.Item value="30m" title="30 minutes" />
        <Form.Dropdown.Item value="1h" title="1 hour" />
        <Form.Dropdown.Item value="24h" title="24 hours" />
        <Form.Dropdown.Item value="7d" title="7 days" />
      </Form.Dropdown>
      <Form.Checkbox id="selfDestruct" title="Self-destruct" label="Delete after first view" defaultValue={true} />
    </Form>
  );
}
