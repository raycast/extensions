import { List, ActionPanel, Action, Icon } from "@raycast/api";

export function AuthenticationEmptyView() {
  return (
    <List.EmptyView
      icon="🔐"
      title="Authentication Required"
      description={`Open Terminal and run this command:

az login

(Press Enter to copy)`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy: Az Login"
            content="az login"
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Full Setup Commands"
            content="az login && az extension add --name azure-devops && az devops configure --defaults organization=https://dev.azure.com/AKSONewBuild project=WeDo"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            icon={Icon.Code}
          />
          <Action.OpenInBrowser
            title="Azure Devops Cli Documentation"
            url="https://aka.ms/azure-devops-cli-auth"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
