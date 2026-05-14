import { Action, ActionPanel, Form, open, showHUD, popToRoot } from "@raycast/api";

interface FormValues {
  link: string;
}

function normalizeLink(input: string): string {
  const trimmed = input.trim();

  // Full URL already
  if (trimmed.startsWith("https://telemost.yandex.ru/")) {
    return trimmed;
  }

  // Just the meeting code (e.g. "j/abc123" or "abc123")
  if (trimmed.startsWith("j/")) {
    return `https://telemost.yandex.ru/${trimmed}`;
  }

  // Bare code without "j/" prefix
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return `https://telemost.yandex.ru/j/${trimmed}`;
  }

  return trimmed;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    const url = normalizeLink(values.link);
    await open(url);
    await showHUD("Joining meeting...");
    await popToRoot();
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
      />
    </Form>
  );
}
