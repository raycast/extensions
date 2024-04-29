import { ActionPanel, List } from "@raycast/api";

type Props = {
  isLoading: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  syncAction?: React.ReactNode;
};

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
