import { Action, ActionPanel, Form, open } from "@raycast/api";
export default function OpenResult() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in FrameMind"
            onSubmit={({ asset }: { asset: string }) => {
              open(
                `framemind://open?asset=${encodeURIComponent(asset.trim())}`,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="asset" title="Asset ID" placeholder="UUID" />
    </Form>
  );
}
