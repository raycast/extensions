import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { ContractEntity } from "./api";
import { useContractsQuery, getContractsErrorMessage } from "./hooks/useContracts";
import { useAccount } from "./hooks/useAccount";
import { formatDate, formatAddress, formatNumber } from "./utils";
import { QueryWrapper } from "./providers/QueryProvider";
import ContractsCreate from "./contracts-create";
import NftsCreate from "./nfts-create";
import { AssetsList } from "./components/AssetsList";

function ContractsListContent() {
  const { data, isLoading, error, refetch } = useContractsQuery();
  const { userId, smartContractsLimit } = useAccount();
  const { push } = useNavigation();

  const getStatusIcon = (status: string): Icon => {
    switch (status.toLowerCase()) {
      case "active":
      case "deployed":
        return Icon.CheckCircle;
      case "pending":
        return Icon.Clock;
      case "failed":
        return Icon.XMarkCircle;
      default:
        return Icon.Circle;
    }
  };

  const handleRetry = async () => {
    await refetch();
  };

  // Show error toast when error occurs
  if (error) {
    const errorMessage = getContractsErrorMessage(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error Loading Collections",
      message: errorMessage,
    });
  }

  // Error state with retry option
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Collections"
          description={getContractsErrorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const contracts = data?.contracts || [];

  // Group contracts like in web-app
  const personalContracts = contracts.filter((contract) => contract.type !== "EXTERNAL" && userId === contract.userId);
  const commonContracts = contracts.filter((contract) => contract.type === "EXTERNAL");
  const externalContracts = contracts.filter((contract) => contract.type !== "EXTERNAL" && userId !== contract.userId);

  const canCreateMore = personalContracts.length < smartContractsLimit;

  const handleCreateCollection = () => {
    if (!canCreateMore) {
      showToast({
        style: Toast.Style.Failure,
        title: "Limit Reached",
        message: `You have reached the limit of ${smartContractsLimit} collections`,
      });
      return;
    }
    push(<ContractsCreate />);
  };

  const renderContract = (contract: ContractEntity) => (
    <List.Item
      key={contract.id}
      icon={getStatusIcon(contract.status)}
      title={contract.name}
      subtitle={contract.symbol}
      accessories={[{ text: contract.ercType }, { text: `${formatNumber(contract.count ?? 0)} assets` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Assets"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                push(
                  <QueryWrapper>
                    <AssetsList
                      contractId={contract.id}
                      searchBarPlaceholder={`Search assets in ${contract.name}...`}
                    />
                  </QueryWrapper>,
                );
              }}
            />
            <Action.CopyToClipboard
              title="Copy Contract ID"
              content={contract.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {contract.address && (
              <Action.CopyToClipboard
                title="Copy Contract Address"
                content={contract.address}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Create Asset"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => {
                // Check if contract is deployed/active before allowing asset creation
                if (contract.status === "COMPLETE") {
                  push(<NftsCreate contractId={contract.id} />);
                } else {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Contract Not Ready",
                    message: "Collection must be deployed before creating assets",
                  });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              onAction={handleRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Collection Information" />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Name" text={contract.name} />
              <List.Item.Detail.Metadata.Label title="Symbol" text={contract.symbol} />
              <List.Item.Detail.Metadata.Label title="Type" text={contract.type} />
              <List.Item.Detail.Metadata.Label title="ERC Type" text={contract.ercType} />
              <List.Item.Detail.Metadata.Label title="Status" text={contract.status} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Contract ID" text={contract.id} />
              {contract.address && (
                <List.Item.Detail.Metadata.Label title="Address" text={formatAddress(contract.address)} />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created" text={formatDate(contract.createdAt)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      {contracts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Collections Found"
          description="You haven't created any collections yet. Create your first collection to get started."
          actions={
            <ActionPanel>
              <Action title="Create Collection" icon={Icon.Plus} onAction={handleCreateCollection} />
              <Action title="Refresh" onAction={handleRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {canCreateMore && (
            <List.Item
              title="Create New Collection"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action title="Create Collection" icon={Icon.Plus} onAction={handleCreateCollection} />
                </ActionPanel>
              }
            />
          )}

          {/* Personal Collections Section */}
          {(personalContracts.length > 0 || personalContracts.length < smartContractsLimit) && (
            <List.Section title={`Personal (${personalContracts.length}/${smartContractsLimit})`}>
              {personalContracts.map(renderContract)}
            </List.Section>
          )}

          {/* Common Collections Section */}
          {commonContracts.length > 0 && (
            <List.Section title="Common">{commonContracts.map(renderContract)}</List.Section>
          )}

          {/* External Collections Section */}
          {externalContracts.length > 0 && (
            <List.Section title="External">{externalContracts.map(renderContract)}</List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default function ContractsList() {
  return (
    <QueryWrapper>
      <ContractsListContent />
    </QueryWrapper>
  );
}
