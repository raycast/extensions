import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function EditClipboardText() {
  const { data: text, isLoading } = usePromise(Clipboard.readText, [], {
    onError: async () => {
      showToast(Toast.Style.Failure, "Failed to read clipboard content");
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Clipboard}
            title="Copy to Clipboard"
            onSubmit={async ({ edited }) => {
              await Clipboard.copy(edited);
              await showHUD("Copied to clipboard");
              await popToRoot();
            }}
          />
          <Action.SubmitForm
            icon={Icon.Clipboard}
            title="Paste to Active App"
            onSubmit={async ({ edited }) => {
              await Clipboard.paste(edited);
              await closeMainWindow();
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {isLoading ? null : (
        <>
          <Form.Description text="Edit your clipboard text in the text area below." />
          <Form.TextArea id="edited" defaultValue={text} />
        </>
      )}
    </Form>
  );
}
