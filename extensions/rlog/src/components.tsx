import { Form } from "@raycast/api";
import { useEffect } from "react";
import { getActiveUrl } from "./utils/browser";

/** Shared URL validator used by every reading form. */
export function validateUrl(value?: string): string | undefined {
  if (!value) return "The item is required";
  try {
    new URL(value);
  } catch (e) {
    return "Invalid URL";
  }
}

/** Auto-fill the form's URL field from the active browser tab (clipboard fallback). */
export function useActiveUrlAutofill(
  setValue: (id: "url", value: string) => void,
): void {
  useEffect(() => {
    async function fetchUrl() {
      const url = await getActiveUrl();
      if (url) setValue("url", url);
    }
    fetchUrl();
  }, []);
}

type FieldProps = Form.ItemProps<string>;

/**
 * The URL / Thoughts / Rating fields shared by the capture and log-read forms.
 * Purely presentational — no git, no preferences — so it stays usable by the
 * credential-free capture command.
 */
export function ReadingFields(props: {
  url: FieldProps;
  thoughts: FieldProps;
  rating: FieldProps;
}) {
  return (
    <>
      <Form.TextField
        title="URL"
        placeholder="https://example.com/article"
        {...props.url}
      />
      <Form.TextArea
        title="Thoughts"
        placeholder="Optional thoughts..."
        {...props.thoughts}
      />
      <Form.Dropdown title="Rating" {...props.rating}>
        <Form.Dropdown.Item value="" title="No rating" />
        <Form.Dropdown.Item value="1" title="1" />
        <Form.Dropdown.Item value="2" title="2" />
        <Form.Dropdown.Item value="3" title="3" />
        <Form.Dropdown.Item value="4" title="4" />
        <Form.Dropdown.Item value="5" title="5" />
      </Form.Dropdown>
    </>
  );
}
