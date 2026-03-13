import { ActionPanel, Action, Icon, List, Toast, showToast, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Sort options for the contracts list
const SortOption = {
  SavingsHighToLow: "Savings: High to Low",
  SavingsLowToHigh: "Savings: Low to High",
  ValueHighToLow: "Value: High to Low",
  ValueLowToHigh: "Value: Low to High",
  Agency: "Agency",
  Date: "Date",
  Status: "Status",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState(SortOption.SavingsHighToLow);
  const [selectedContractId, setSelectedContractId] = useState(null);

  const {
    data: contractsData,
    isLoading,
    pagination: listPagination,
    error,
    revalidate,
  } = useFetch(
    (options) => `https://api.doge.gov/savings/contracts?page=${options.page + 1}&q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      mapResult: (result) => {
        // Store the total count for display purposes
        setTotalResults(result.meta.total_results);

        return {
          data: result.result.contracts,
          hasMore: result.meta.pages > 1,
        };
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load contracts",
          message: error.message,
        });
      },
    },
  );

  // Access the contracts from the data structure
  const contracts = contractsData || [];

  // Filter contracts
  const filteredContracts = searchText.trim()
    ? contracts.filter(
        (contract) =>
          contract.vendor.toLowerCase().includes(searchText.toLowerCase()) ||
          contract.agency.toLowerCase().includes(searchText.toLowerCase()) ||
          contract.description.toLowerCase().includes(searchText.toLowerCase()) ||
          contract.piid.toLowerCase().includes(searchText.toLowerCase()),
      )
    : contracts;

  // Apply sorting
  const sortedContracts = [...filteredContracts].sort((a, b) => {
    switch (sortBy) {
      case SortOption.SavingsHighToLow:
        return b.savings - a.savings;
      case SortOption.SavingsLowToHigh:
        return a.savings - b.savings;
      case SortOption.ValueHighToLow:
        return b.value - a.value;
      case SortOption.ValueLowToHigh:
        return a.value - b.value;
      case SortOption.Agency:
        return a.agency.localeCompare(b.agency);
      case SortOption.Date:
        return new Date(b.deleted_date).getTime() - new Date(a.deleted_date).getTime();
      case SortOption.Status:
        return a.fpds_status.localeCompare(b.fpds_status);
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalSavings = filteredContracts.reduce((sum, contract) => sum + contract.savings, 0);
  const totalValue = filteredContracts.reduce((sum, contract) => sum + contract.value, 0);

  // Format currency values with dollar sign and commas
  const formatCurrency = (value) => `$${value.toLocaleString()}`;

  // Get status icon based on fpds_status
  const getStatusIcon = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("terminated")) return Icon.XMarkCircle;
    if (statusLower.includes("expired")) return Icon.Clock;
    if (statusLower.includes("base award")) return Icon.CheckCircle;
    if (statusLower.includes("option")) return Icon.Star;
    return Icon.Document;
  };

  // Generate markdown for the detail view
  const getContractDetailMarkdown = (contract) => {
    return `
# ${contract.vendor}

**PIID:** ${contract.piid}  
**Agency:** ${contract.agency}  
**Removal Date:** ${contract.deleted_date}  
**Value:** ${formatCurrency(contract.value)}  
**Savings:** ${formatCurrency(contract.savings)} (${((contract.savings / contract.value) * 100).toFixed(1)}%)  
**Status:** ${contract.fpds_status}

## Description

${contract.description}

${contract.fpds_link ? `[View Contract Details on FPDS](${contract.fpds_link})` : ""}
    `;
  };

  // Render detailed view if a contract is selected
  if (selectedContractId !== null) {
    const selectedContract = contracts.find((_, index) => index === selectedContractId);

    if (!selectedContract) {
      return <Detail markdown="Contract not found" />;
    }

    return (
      <Detail
        markdown={getContractDetailMarkdown(selectedContract)}
        actions={
          <ActionPanel>
            <Action title="Back to List" onAction={() => setSelectedContractId(null)} />
            {selectedContract.fpds_link && (
              <Action.OpenInBrowser url={selectedContract.fpds_link} title="View Contract Details on Fpds" />
            )}
            <Action.CopyToClipboard content={selectedContract.description} title="Copy Description" />
            <Action.CopyToClipboard
              content={`${selectedContract.vendor} - ${formatCurrency(selectedContract.savings)} saved`}
              title="Copy Savings Info"
            />
            <Action.CopyToClipboard content={JSON.stringify(selectedContract, null, 2)} title="Copy Raw Data" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contracts by vendor, agency, or description..."
      onSearchTextChange={setSearchText}
      pagination={listPagination}
      navigationTitle="Contract Savings"
      searchText={searchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" storeValue={true} onChange={(newValue) => setSortBy(newValue)}>
          {Object.values(SortOption).map((option) => (
            <List.Dropdown.Item key={option} title={option} value={option} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load contracts"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`Total Savings: ${formatCurrency(totalSavings)} of ${formatCurrency(totalValue)}`}
          subtitle={`${filteredContracts.length} of ${totalResults} contracts`}
        >
          {sortedContracts.map((contract, index) => (
            <List.Item
              key={index}
              icon={{
                source: getStatusIcon(contract.fpds_status),
                tooltip: `Status: ${contract.fpds_status}`,
              }}
              title={contract.vendor}
              subtitle={`${contract.deleted_date} • ${contract.agency}`}
              accessories={[
                {
                  icon: Icon.ArrowNe,
                  text: `${formatCurrency(contract.savings)} saved`,
                  tooltip: `${((contract.savings / contract.value) * 100).toFixed(1)}% savings`,
                },
                {
                  tag: {
                    value:
                      contract.savings > 0
                        ? `${((contract.savings / contract.value) * 100).toFixed(0)}%`
                        : contract.fpds_status,
                    color:
                      contract.savings > 0
                        ? contract.savings / contract.value > 0.5
                          ? "green"
                          : contract.savings / contract.value > 0.25
                            ? "yellow"
                            : "red"
                        : "grey",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => setSelectedContractId(index)} />
                  {contract.fpds_link && (
                    <Action.OpenInBrowser url={contract.fpds_link} title="View Contract Details" />
                  )}
                  <Action.CopyToClipboard content={contract.description} title="Copy Description" />
                  <Action.CopyToClipboard
                    content={`${contract.vendor} - ${formatCurrency(contract.savings)} saved`}
                    title="Copy Savings Info"
                  />
                  <Action.CopyToClipboard content={`PIID: ${contract.piid}`} title="Copy Piid" />
                  <Action.CopyToClipboard content={JSON.stringify(contract, null, 2)} title="Copy Raw Data" />
                  <Action title="Refresh Data" onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
