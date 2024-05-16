import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";
import { IAction } from "../constants/initialActions";

interface ResultPageProps {
  action: IAction;
  result: string;
}

export default function ResultPage({ action, result }: ResultPageProps) {
  const markdown = `## ${action.title}\n\n${result || "Loading..."}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Result to Clipboard"
            onAction={() => {
              Clipboard.copy(result);
              showToast(Toast.Style.Success, "Copied to Clipboard");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
