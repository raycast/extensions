import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";

interface UrlFormValues {
  url: string;
}

interface UrlInputFormProps {
  initialUrl?: string;
  invalidInput?: string;
  onSubmit: (url: string) => void;
}

function normalizeUrl(text: string): string {
  const trimmed = text.trim();
  // If it doesn't start with a protocol, prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(text: string): boolean {
  try {
    const normalized = normalizeUrl(text);
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function UrlInputForm({ initialUrl, invalidInput, onSubmit }: UrlInputFormProps) {
  const { handleSubmit, itemProps } = useForm<UrlFormValues>({
    onSubmit: (values) => {
      const normalized = normalizeUrl(values.url);
      onSubmit(normalized);
    },
    validation: {
      url: (value) => {
        if (!value || !value.trim()) {
          return "Please enter a URL";
        }
        if (!isValidUrl(value)) {
          return "Please enter a valid URL or domain";
        }
      },
    },
    initialValues: {
      url: initialUrl || "",
    },
  });

  const getDescription = () => {
    if (invalidInput) {
      const truncated = invalidInput.length > 100 ? `${invalidInput.slice(0, 100)}...` : invalidInput;
      return `Couldn't find a valid link in your input "${truncated}".\n\nEnter a valid URL and hit return.`;
    }
    return "No URL was found in your clipboard, selection, or browser. Please enter a URL to read.";
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in Reader"
            icon={Icon.Book}
            onSubmit={handleSubmit}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={getDescription()} />
      <Form.TextField title="URL" placeholder="https://example.com/article" autoFocus {...itemProps.url} />
    </Form>
  );
}
