import { ActionPanel, Action, Icon, List, Toast, showToast, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Sort options for the grants list
const SortOption = {
  SavingsHighToLow: "Savings: High to Low",
  SavingsLowToHigh: "Savings: Low to High",
  ValueHighToLow: "Value: High to Low",
  ValueLowToHigh: "Value: Low to High",
  Agency: "Agency",
  Date: "Date",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState(SortOption.SavingsHighToLow);
  const [selectedGrantId, setSelectedGrantId] = useState(null);

  const {
    data: grantsData,
    isLoading,
    pagination: listPagination,
    error,
    revalidate,
  } = useFetch(
    (options) => `https://api.doge.gov/savings/grants?page=${options.page + 1}&q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      mapResult: (result) => {
        // Store the total count for display purposes
        setTotalResults(result.meta.total_results);

        return {
          data: result.result.grants,
          hasMore: result.meta.pages > 1,
        };
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load grants",
          message: error.message,
        });
      },
    },
  );

  const grants = grantsData || [];

  // Filter grants based on search text (client-side filtering as backup)
  const filteredGrants = searchText.trim()
    ? grants.filter(
        (grant) =>
          grant.recipient.toLowerCase().includes(searchText.toLowerCase()) ||
          grant.agency.toLowerCase().includes(searchText.toLowerCase()) ||
          grant.description.toLowerCase().includes(searchText.toLowerCase()),
      )
    : grants;

  // Apply sorting to the grants array
  const sortedGrants = [...filteredGrants].sort((a, b) => {
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
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      default:
        return 0;
    }
  });

  // Calculate total savings and value for display based on filtered data
  const totalSavings = filteredGrants.reduce((sum, grant) => sum + grant.savings, 0);
  const totalValue = filteredGrants.reduce((sum, grant) => sum + grant.value, 0);

  // Format currency values with dollar sign and commas
  const formatCurrency = (value) => `$${value.toLocaleString()}`;

  // Generate markdown for the detail view
  const getGrantDetailMarkdown = (grant) => {
    return `
# ${grant.recipient}

**Agency:** ${grant.agency}  
**Date:** ${grant.date}  
**Value:** ${formatCurrency(grant.value)}  
**Savings:** ${formatCurrency(grant.savings)} (${((grant.savings / grant.value) * 100).toFixed(1)}%)

## Description

${grant.description}

${grant.link ? `[View Grant Details](${grant.link})` : ""}
    `;
  };

  // Render detailed view if a grant is selected
  if (selectedGrantId !== null) {
    const selectedGrant = grants.find((_, index) => index === selectedGrantId);

    if (!selectedGrant) {
      return <Detail markdown="Grant not found" />;
    }

    return (
      <Detail
        markdown={getGrantDetailMarkdown(selectedGrant)}
        actions={
          <ActionPanel>
            <Action title="Back to List" onAction={() => setSelectedGrantId(null)} />
            {selectedGrant.link && <Action.OpenInBrowser url={selectedGrant.link} title="View Grant Details" />}
            <Action.CopyToClipboard content={selectedGrant.description} title="Copy Description" />
            <Action.CopyToClipboard content={JSON.stringify(selectedGrant, null, 2)} title="Copy Raw Data" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search grants by recipient, agency, or description..."
      onSearchTextChange={setSearchText}
      pagination={listPagination}
      navigationTitle="Grant Savings"
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
          title="Failed to load grants"
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
          subtitle={`${filteredGrants.length} of ${totalResults} grants`}
        >
          {sortedGrants.map((grant, index) => (
            <List.Item
              key={index}
              icon={grant.savings > 1000000 ? Icon.Star : Icon.Coins}
              title={grant.recipient}
              subtitle={`${grant.date} • ${grant.agency}`}
              accessories={[
                {
                  icon: Icon.ArrowNe,
                  text: `${formatCurrency(grant.savings)} saved`,
                  tooltip: `${((grant.savings / grant.value) * 100).toFixed(1)}% savings`,
                },
                {
                  tag: {
                    value: `${((grant.savings / grant.value) * 100).toFixed(0)}%`,
                    color:
                      grant.savings / grant.value > 0.5
                        ? "green"
                        : grant.savings / grant.value > 0.25
                          ? "yellow"
                          : "red",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => setSelectedGrantId(index)} />
                  {grant.link && <Action.OpenInBrowser url={grant.link} title="View Grant Details" />}
                  <Action.CopyToClipboard content={grant.description} title="Copy Description" />
                  <Action.CopyToClipboard
                    content={`${grant.recipient} - ${formatCurrency(grant.savings)} saved`}
                    title="Copy Savings Info"
                  />
                  <Action.CopyToClipboard content={JSON.stringify(grant, null, 2)} title="Copy Raw Data" />
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
