import { ActionPanel, List } from "@raycast/api";

type Props = {
  isLoading: boolean;
  isEmpty?: boolean;
  syncAction: React.ReactNode;
};

export default function EmptyView({ isEmpty, isLoading, syncAction }: Props) {
  if (isLoading) {
    return <List.EmptyView title="Loading..." description="Please wait." />;
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
