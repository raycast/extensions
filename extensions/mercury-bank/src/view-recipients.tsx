import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { RecipientListItem } from "./components/RecipientListItem";
import { useRecipients } from "./lib/hooks/useRecipients";

export default function ViewRecipients() {
  return (
    <FeatureGuard feature="recipients">
      {(apiKey, accountName) => (
        <RecipientsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function RecipientsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: recipients, isLoading } = useRecipients(apiKey);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);

  const filtered = (recipients ?? []).filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search recipients..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue
          onChange={setStatusFilter}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title="Deleted"
            value="deleted"
            icon={Icon.XMarkCircle}
          />
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 && (
        <EmptyView
          title="No Recipients"
          description="No recipients found"
          icon={Icon.Person}
        />
      )}
      <List.Section
        title="Recipients"
        subtitle={`${filtered.length} recipients`}
      >
        {filtered.map((recipient) => (
          <RecipientListItem
            key={recipient.id}
            recipient={recipient}
            showDetail={showDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}