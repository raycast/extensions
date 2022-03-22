import { ActionPanel, Form, Action, Clipboard, showHUD, useNavigation, clearSearchBar } from "@raycast/api";

function string_to_slug(str: string): string {
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export default function Command() {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Sluglify"
            onSubmit={async ({ text }) => {
              const slug = string_to_slug(text);
              await Clipboard.copy(slug);
              await showHUD(`Copied to clipboard: ${slug}`);
              pop();
              await clearSearchBar();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" placeholder="Enter text to sluglify" />
    </Form>
  );
}
