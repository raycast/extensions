import { Action, ActionPanel, Form, getPreferenceValues, open, showHUD, popToRoot } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";

interface FormValues {
  link: string;
}

const TELEMOST_PREFIX = "https://telemost.yandex.ru/";
const CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

function normalizeLink(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith(TELEMOST_PREFIX)) {
    return trimmed;
  }

  if (trimmed.startsWith("j/")) {
    return `${TELEMOST_PREFIX}${trimmed}`;
  }

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

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const url = normalizeLink(values.link);
      try {
        await Promise.all([open(url, preferredBrowserApp ?? undefined), showHUD("Joining meeting…"), popToRoot()]);
      } catch (e) {
        await showFailureToast(e, { title: "Failed to open meeting" });
      }
    },
    validation: {
      link: (value) => {
        if (!value || !value.trim()) return "Please enter a meeting link or code";
        if (!isValidInput(value)) return "Enter a Telemost link or meeting code";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Join Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.link}
        title="Meeting Link or Code"
        placeholder="https://telemost.yandex.ru/j/... or meeting code"
        autoFocus
      />
    </Form>
  );
}
