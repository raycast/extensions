import { Action, ActionPanel, Detail, List } from "@raycast/api";

type Props = {
  isLoading: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  syncAction?: React.ReactNode;
};

const troubleshootingMarkdown = `
# Troubleshooting

To troubleshoot issues with syncing your vault or if passwords and notes are not appearing, please follow these steps:

1. Check if the Dashlane CLI is installed by running the following command in your terminal:

\`\`\`sh
dcli --version
\`\`\`

2. Verify if you are logged in by running the following command in your terminal:

\`\`\`sh
dcli accounts whoami
\`\`\`

3. Retrieve the path to the Dashlane CLI by running the following command in your terminal:

\`\`\`sh
which dcli
\`\`\`

4. Set the path to the Dashlane CLI in the extension preferences of Raycast. Open Raycast preferences, navigate to the Dashlane Vault extension, and specify the path to the Dashlane CLI.

# Unsupported Versions

Currently there is a version (v6.2415.0) of the Dashlane CLI with a bug, that can only be fixed by upgrading the CLI.
`;

export default function ({ isEmpty, isError, isLoading, syncAction }: Props) {
  if (isLoading) {
    return <List.EmptyView title="Loading..." description="Please wait." />;
  }

  if (isError) {
    return (
      <List.EmptyView
        icon={{ source: "dashlane-64.png" }}
        title="Error"
        description="Vault items could not be fetched"
        actions={
          <ActionPanel>
            <Action.Push
              title="Troubleshooting"
              target={<Detail navigationTitle="Troubleshooting" markdown={troubleshootingMarkdown} />}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={{ source: "dashlane-64.png" }}
      title={isEmpty ? "Vault empty" : "No matching items found"}
      description={
        isEmpty
          ? "Hit the sync button to sync your vault or try logging in again."
          : "Hit the sync button to sync your vault."
      }
      actions={!isLoading && <ActionPanel>{syncAction}</ActionPanel>}
    />
  );
}
