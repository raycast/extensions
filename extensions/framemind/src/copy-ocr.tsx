import { Action, ActionPanel, Form, Clipboard, showHUD } from "@raycast/api";
import { framemind } from "./framemind";
export default function CopyOCR() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy OCR"
            onSubmit={async ({ asset }: { asset: string }) => {
              const result = await framemind(["ocr", asset.trim()]);
              await Clipboard.copy(String(result.data?.text ?? ""));
              await showHUD("OCR copied");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="asset" title="Asset ID" placeholder="UUID" />
    </Form>
  );
}
