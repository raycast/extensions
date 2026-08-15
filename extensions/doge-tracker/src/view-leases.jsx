import { ActionPanel, Action, Icon, List, Toast, showToast, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Sort options for the leases list
const SortOption = {
  SavingsHighToLow: "Savings: High to Low",
  SavingsLowToHigh: "Savings: Low to High",
  ValueHighToLow: "Value: High to Low",
  ValueLowToHigh: "Value: Low to High",
  SquareFootageHighToLow: "Square Footage: High to Low",
  SquareFootageLowToHigh: "Square Footage: Low to High",
  Date: "Date",
  Agency: "Agency",
  Location: "Location",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState(SortOption.SavingsHighToLow);
  const [selectedLeaseId, setSelectedLeaseId] = useState(null);

  const {
    data: leasesData,
    isLoading,
    pagination: listPagination,
    error,
    revalidate,
  } = useFetch(
    (options) => `https://api.doge.gov/savings/leases?page=${options.page + 1}&q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      mapResult: (result) => {
        // Store the total count for display purposes
        setTotalResults(result.meta.total_results);

        return {
          data: result.result.leases,
          hasMore: result.meta.pages > 1,
        };
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load leases",
          message: error.message,
        });
      },
    },
  );

  // Access the leases directly
  const leases = leasesData || [];

  // Filter leases
  const filteredLeases = searchText.trim()
    ? leases.filter(
        (lease) =>
          lease.location.toLowerCase().includes(searchText.toLowerCase()) ||
          lease.agency.toLowerCase().includes(searchText.toLowerCase()) ||
          lease.description.toLowerCase().includes(searchText.toLowerCase()),
      )
    : leases;

  // Apply sorting
  const sortedLeases = [...filteredLeases].sort((a, b) => {
    switch (sortBy) {
      case SortOption.SavingsHighToLow:
        return b.savings - a.savings;
      case SortOption.SavingsLowToHigh:
        return a.savings - b.savings;
      case SortOption.ValueHighToLow:
        return b.value - a.value;
      case SortOption.ValueLowToHigh:
        return a.value - b.value;
      case SortOption.SquareFootageHighToLow:
        return b.sq_ft - a.sq_ft;
      case SortOption.SquareFootageLowToHigh:
        return a.sq_ft - b.sq_ft;
      case SortOption.Agency:
        return a.agency.localeCompare(b.agency);
      case SortOption.Date:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case SortOption.Location:
        return a.location.localeCompare(b.location);
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalSavings = filteredLeases.reduce((sum, lease) => sum + lease.savings, 0);
  const totalSquareFt = filteredLeases.reduce((sum, lease) => sum + lease.sq_ft, 0);

  // Format currency values with dollar sign and commas
  const formatCurrency = (value) => `$${value.toLocaleString()}`;

  // Format square footage with commas
  const formatSquareFt = (value) => `${value.toLocaleString()} sq.ft.`;

  // Choose icon based on savings amount
  const getLeaseIcon = (lease) => {
    if (lease.savings > 1000000) return Icon.Building;
    if (lease.savings > 500000) return Icon.House;
    if (lease.sq_ft > 10000) return Icon.Window;
    return Icon.Key; // Using Key instead of Door which doesn't exist
  };

  // Get description for the termination type
  const getTerminationDescription = (description) => {
    if (description.includes("Mass Mod")) {
      return "Mass Modification: A bulk termination process where multiple lease agreements are terminated simultaneously through a single administrative action";
    } else if (description.includes("Soft Term")) {
      return "Soft Term Termination: Ending leases that have contractual 'soft terms' allowing the government to terminate before the official end date with minimal penalties";
    } else if (description.includes("True Termination")) {
      return "True Termination: Complete termination of the lease, typically involving moving to federal space instead of leased space";
    } else if (description.toLowerCase().includes("reduction goals")) {
      return "Reduction Goals: Lease terminated as part of the administration's space reduction initiative to reduce federal real estate footprint";
    } else {
      return "Other types of lease terminations not falling into the standard categories";
    }
  };

  // Get the termination type and color for display
  const getTerminationType = (description) => {
    if (description.includes("Mass Mod")) {
      return {
        value: "Mass Mod Termination",
        color: "purple",
      };
    } else if (description.includes("Soft Term")) {
      return {
        value: "Soft Term Termination",
        color: "blue",
      };
    } else if (description.includes("True Termination")) {
      return {
        value: "True Termination",
        color: "red",
      };
    } else if (description.toLowerCase().includes("reduction goals")) {
      return {
        value: "Reduction Goals",
        color: "green",
      };
    } else {
      return {
        value: "Other Termination",
        color: "orange",
      };
    }
  };

  // Generate markdown for the detail view
  const getLeaseDetailMarkdown = (lease) => {
    return `
# ${lease.location}

**Agency:** ${lease.agency}  
**Removal Date:** ${lease.date}  
**Square Footage:** ${formatSquareFt(lease.sq_ft)}  
**Value:** ${formatCurrency(lease.value)}  
**Savings:** ${formatCurrency(lease.savings)} (${((lease.savings / lease.value) * 100).toFixed(1)}%)

## Description

${lease.description}

### Cost Analysis
- Cost per Square Foot: ${formatCurrency(lease.value / lease.sq_ft)} per sq.ft.
- Savings per Square Foot: ${formatCurrency(lease.savings / lease.sq_ft)} per sq.ft.
    `;
  };

  // Render detailed view if a lease is selected
  if (selectedLeaseId !== null) {
    const selectedLease = leases.find((_, index) => index === selectedLeaseId);

    if (!selectedLease) {
      return <Detail markdown="Lease not found" />;
    }

    return (
      <Detail
        markdown={getLeaseDetailMarkdown(selectedLease)}
        actions={
          <ActionPanel>
            <Action title="Back to List" onAction={() => setSelectedLeaseId(null)} />
            <Action.CopyToClipboard content={selectedLease.description} title="Copy Description" />
            <Action.CopyToClipboard
              content={`${selectedLease.location} - ${formatCurrency(selectedLease.savings)} saved`}
              title="Copy Savings Info"
            />
            <Action.CopyToClipboard
              content={`${selectedLease.location}: ${formatSquareFt(selectedLease.sq_ft)}`}
              title="Copy Space Info"
            />
            <Action.CopyToClipboard content={JSON.stringify(selectedLease, null, 2)} title="Copy Raw Data" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search leases by location, agency, or description..."
      onSearchTextChange={setSearchText}
      pagination={listPagination}
      navigationTitle="Lease Savings"
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
          title="Failed to load leases"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`Total Savings: ${formatCurrency(totalSavings)} | Total Space: ${formatSquareFt(totalSquareFt)}`}
          subtitle={`${filteredLeases.length} of ${totalResults} leases`}
        >
          {sortedLeases.map((lease, index) => (
            <List.Item
              key={index}
              icon={{
                source: getLeaseIcon(lease),
                tooltip: `${formatSquareFt(lease.sq_ft)}`,
              }}
              title={lease.location}
              subtitle={`${lease.date} • ${lease.agency}`}
              accessories={[
                {
                  icon: Icon.ArrowNe,
                  text: `${formatCurrency(lease.savings)} saved`,
                  tooltip: `${((lease.savings / lease.value) * 100).toFixed(1)}% savings`,
                },
                {
                  tag: getTerminationType(lease.description),
                  tooltip: getTerminationDescription(lease.description),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => setSelectedLeaseId(index)} />
                  <Action.CopyToClipboard content={lease.description} title="Copy Description" />
                  <Action.CopyToClipboard
                    content={`${lease.location} - ${formatCurrency(lease.savings)} saved`}
                    title="Copy Savings Info"
                  />
                  <Action.CopyToClipboard
                    content={`${lease.location}: ${formatSquareFt(lease.sq_ft)}`}
                    title="Copy Space Info"
                  />
                  <Action.CopyToClipboard content={JSON.stringify(lease, null, 2)} title="Copy Raw Data" />
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
