import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { InvoiceListItem } from "./components/InvoiceListItem";
import { useInvoices } from "./lib/hooks/useInvoices";

export default function ViewInvoices() {
  return (
    <FeatureGuard feature="invoices">
      {(apiKey, accountName) => (
        <InvoicesList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function InvoicesList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);
  const { data: invoices, isLoading } = useInvoices(apiKey, statusFilter);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search invoices..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue
          onChange={(val) => setStatusFilter(val === "all" ? undefined : val)}
        >
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Item
            title="Unpaid"
            value="Unpaid"
            icon={Icon.Document}
          />
          <List.Dropdown.Item
            title="Paid"
            value="Paid"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title="Processing"
            value="Processing"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="Cancelled"
            value="Cancelled"
            icon={Icon.XMarkCircle}
          />
        </List.Dropdown>
      }
    >
      {!isLoading && invoices && invoices.length === 0 && (
        <EmptyView
          title="No Invoices"
          description="No invoices found"
          icon={Icon.Document}
        />
      )}
      <List.Section
        title="Invoices"
        subtitle={`${(invoices ?? []).length} invoices`}
      >
        {(invoices ?? []).map((invoice) => (
          <InvoiceListItem
            key={invoice.id}
            invoice={invoice}
            showDetail={showDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}