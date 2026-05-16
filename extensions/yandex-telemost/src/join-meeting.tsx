import { Action, ActionPanel, Form, getPreferenceValues, open, showHUD, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  link: string;
}

const TELEMOST_PREFIX = "https://telemost.yandex.ru/";
const CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

function normalizeLink(input: string): string {
  const trimmed = input.trim();

  // Full URL already
  if (trimmed.startsWith(TELEMOST_PREFIX)) {
    return trimmed;
  }

  // Just the meeting code (e.g. "j/abc123")
  if (trimmed.startsWith("j/")) {
    return `${TELEMOST_PREFIX}${trimmed}`;
  }

  // Bare code without "j/" prefix
  if (CODE_REGEX.test(trimmed)) {
    return `${TELEMOST_PREFIX}j/${trimmed}`;
  }

  return trimmed;
}

function isValidInput(value: string): boolean {
  const t = value.trim();
  return t.startsWith(TELEMOST_PREFIX) || t.startsWith("j/") || CODE_REGEX.test(t);
}

export default function Command() {
  const { browser: preferredBrowserApp } = getPreferenceValues<Preferences>();

  async function handleSubmit(values: FormValues) {
    const url = normalizeLink(values.link);
    try {
      // Open and pop in parallel — avoids the form lingering during the browser launch
      await Promise.all([open(url, preferredBrowserApp ?? undefined), showHUD("Joining meeting…"), popToRoot()]);
    } catch (e) {
      await showFailureToast(e, { title: "Failed to open meeting" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Join Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="link"
        title="Meeting Link or Code"
        placeholder="https://telemost.yandex.ru/j/... or meeting code"
        autoFocus
        validate={(value) => {
          if (!value || !value.trim()) return "Please enter a meeting link or code";
          if (!isValidInput(value)) return "Enter a Telemost link or meeting code";
        }}
      />
    </Form>
  );
}
