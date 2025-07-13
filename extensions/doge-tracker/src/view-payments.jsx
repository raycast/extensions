import { ActionPanel, Action, Icon, List, Toast, showToast, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Sort options for the payments list
const SortOption = {
  AmountHighToLow: "Amount: High to Low",
  AmountLowToHigh: "Amount: Low to High",
  DateNewestFirst: "Date: Newest First",
  DateOldestFirst: "Date: Oldest First",
  Agency: "Agency",
  Organization: "Organization",
};

// Filter options
const FilterOption = {
  None: "No Filter",
  Agency: "Filter by Agency",
  Organization: "Filter by Organization",
  Date: "Filter by Date",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState(SortOption.AmountHighToLow);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // Add missing filter state variables
  const [filterOption] = useState(FilterOption.None);
  const [filterValue] = useState("");

  // Convert SortOption to API sort_by and sort_order parameters
  const getSortParams = () => {
    switch (sortBy) {
      case SortOption.AmountHighToLow:
        return { sort_by: "amount", sort_order: "desc" };
      case SortOption.AmountLowToHigh:
        return { sort_by: "amount", sort_order: "asc" };
      case SortOption.DateNewestFirst:
        return { sort_by: "post_date", sort_order: "desc" };
      case SortOption.DateOldestFirst:
        return { sort_by: "post_date", sort_order: "asc" };
      default:
        return { sort_by: "amount", sort_order: "desc" };
    }
  };

  // Convert FilterOption to API filter parameter
  const getFilterParams = () => {
    if (filterOption === FilterOption.None || !filterValue) {
      return {};
    }

    let filter;
    switch (filterOption) {
      case FilterOption.Agency:
        filter = "agency";
        break;
      case FilterOption.Organization:
        filter = "org_name";
        break;
      case FilterOption.Date:
        filter = "post_date";
        break;
      default:
        return {};
    }

    return { filter, filter_value: filterValue };
  };

  // Build the API URL with all parameters
  const buildApiUrl = (options) => {
    const { sort_by, sort_order } = getSortParams();
    const filterParams = getFilterParams();

    const params = new URLSearchParams();
    params.append("page", (options.page + 1).toString());
    params.append("sort_by", sort_by);
    params.append("sort_order", sort_order);
    params.append("q", searchText);

    if ("filter" in filterParams) {
      params.append("filter", filterParams.filter);
      params.append("filter_value", filterParams.filter_value);
    }

    return `https://api.doge.gov/payments?${params.toString()}`;
  };

  const {
    data: paymentsData,
    isLoading,
    pagination: listPagination,
    error,
    revalidate,
  } = useFetch(buildApiUrl, {
    keepPreviousData: true,
    mapResult: (result) => {
      setTotalResults(result.meta.total_results);

      return {
        data: result.result.payments,
        hasMore: result.meta.pages > 1,
      };
    },
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load payments",
        message: error.message,
      });
    },
  });

  // Access the payments directly
  const payments = paymentsData || [];

  // Filter payments
  const filteredPayments = searchText.trim()
    ? payments.filter(
        (payment) =>
          (payment.org_name && payment.org_name.toLowerCase().includes(searchText.toLowerCase())) ||
          (payment.agency && payment.agency.toLowerCase().includes(searchText.toLowerCase())) ||
          (payment.description && payment.description.toLowerCase().includes(searchText.toLowerCase())) ||
          (payment.status_description && payment.status_description.toLowerCase().includes(searchText.toLowerCase())),
      )
    : payments;

  // Apply sorting
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortBy) {
      case SortOption.Agency:
        return a.agency.localeCompare(b.agency);
      case SortOption.Organization:
        return a.org_name.localeCompare(b.org_name);
      default:
        return 0; // For other cases, rely on the server-side sorting
    }
  });

  // Calculate total
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Format currency values with dollar sign and commas
  const formatCurrency = (value) => `$${value.toLocaleString()}`;

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get appropriate icon based on payment status
  const getPaymentIcon = (payment) => {
    const status = payment.status_description?.toLowerCase() || "";

    if (status.includes("completed") || status.includes("success")) {
      return Icon.CheckCircle;
    } else if (status.includes("pending") || status.includes("processing")) {
      return Icon.Clock;
    } else if (status.includes("failed") || status.includes("rejected")) {
      return Icon.XMarkCircle;
    } else if (payment.amount > 1000000) {
      return Icon.BankNote;
    } else if (payment.amount > 100000) {
      return Icon.Coins;
    } else {
      return Icon.Coin;
    }
  };

  // Generate markdown for the detail view
  const getPaymentDetailMarkdown = (payment) => {
    return `
# Payment Details

**Agency:** ${payment.agency}  
**Organization:** ${payment.org_name}  
**Amount:** ${formatCurrency(payment.amount)}  
**Date:** ${formatDate(payment.post_date)}  
**Status:** ${payment.status_description || "Not specified"}

## Description

${payment.description || "No description provided."}
    `;
  };

  // Render detailed view if a payment is selected
  if (selectedPaymentId !== null) {
    const selectedPayment = payments.find((_, index) => index === selectedPaymentId);

    if (!selectedPayment) {
      return <Detail markdown="Payment not found" />;
    }

    return (
      <Detail
        markdown={getPaymentDetailMarkdown(selectedPayment)}
        actions={
          <ActionPanel>
            <Action title="Back to List" onAction={() => setSelectedPaymentId(null)} />
            <Action.CopyToClipboard
              content={selectedPayment.description || "No description provided"}
              title="Copy Description"
            />
            <Action.CopyToClipboard
              content={`${selectedPayment.agency} - ${formatCurrency(selectedPayment.amount)}`}
              title="Copy Payment Info"
            />
            <Action.CopyToClipboard content={JSON.stringify(selectedPayment, null, 2)} title="Copy Raw Data" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search payments by agency, organization, or description..."
      onSearchTextChange={setSearchText}
      pagination={listPagination}
      navigationTitle="Government Payments"
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
          title="Failed to load payments"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`Total Amount: ${formatCurrency(totalAmount)}`}
          subtitle={`${filteredPayments.length} of ${totalResults} payments`}
        >
          {sortedPayments.map((payment, index) => (
            <List.Item
              key={index}
              icon={{
                source: getPaymentIcon(payment),
                tooltip: payment.status_description || "Status not specified",
              }}
              title={payment.org_name}
              subtitle={`${formatDate(payment.post_date)} • ${payment.agency}`}
              accessories={[
                {
                  icon: Icon.BankNote,
                  text: formatCurrency(payment.amount),
                  tooltip: `Payment amount: ${formatCurrency(payment.amount)}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => setSelectedPaymentId(index)} />
                  <Action.CopyToClipboard
                    content={payment.description || "No description provided"}
                    title="Copy Description"
                  />
                  <Action.CopyToClipboard
                    content={`${payment.org_name} - ${formatCurrency(payment.amount)}`}
                    title="Copy Payment Info"
                  />
                  <Action.CopyToClipboard content={formatDate(payment.post_date)} title="Copy Date" />
                  <Action.CopyToClipboard content={JSON.stringify(payment, null, 2)} title="Copy Raw Data" />
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
