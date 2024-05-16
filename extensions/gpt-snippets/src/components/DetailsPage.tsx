import { type IAction as IAction } from "../constants/initialActions";
import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";

interface DetailsPageProps {
  action: IAction;
}
export default function DetailsPage({ action }: DetailsPageProps) {
  const markdown = `
  ## ${action.title}
  **ID:** ${action.id}
  
  **Icon:** ${action.icon}
  
  **Description:** ${action.description}
  
  **Prompt:** ${action.prompt}

  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Prompt to Clipboard"
            onAction={() => {
              Clipboard.copy(action.prompt);
              showToast(Toast.Style.Success, "Copied to Clipboard");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
