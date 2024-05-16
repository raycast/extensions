import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";

export default function ResultPage({ action }: { action: any }) {
  const markdown = `## ${action.title}\n\n${action.result || "Loading..."}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Result to Clipboard"
            onAction={() => {
              Clipboard.copy(action.result);
              showToast(Toast.Style.Success, "Copied to Clipboard");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
