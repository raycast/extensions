import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { CardListItem } from "./components/CardListItem";
import { EmptyView } from "./components/EmptyView";
import { useCards } from "./lib/hooks/useCards";

export default function ViewCards() {
  return (
    <FeatureGuard feature="cards">
      {(apiKey, accountName) => (
        <CardsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function CardsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: cards, isLoading, error } = useCards(apiKey);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);

  useEffect(() => {
    if (error) {
      console.error("[View Cards] Error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load cards",
        message: String(error),
      });
    }
  }, [error]);

  const filteredCards = (cards ?? []).filter(
    (card) => statusFilter === "all" || card.status === statusFilter,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search cards by name..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue
          onChange={setStatusFilter}
        >
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title="Frozen"
            value="frozen"
            icon={Icon.Snowflake}
          />
          <List.Dropdown.Item
            title="Cancelled"
            value="cancelled"
            icon={Icon.XMarkCircle}
          />
          <List.Dropdown.Item
            title="Inactive"
            value="inactive"
            icon={Icon.Circle}
          />
          <List.Dropdown.Item
            title="Expired"
            value="expired"
            icon={Icon.Clock}
          />
        </List.Dropdown>
      }
    >
      {!isLoading && filteredCards.length === 0 && (
        <EmptyView
          title="No Cards"
          description="No cards found"
          icon={Icon.CreditCard}
        />
      )}
      <List.Section title="Cards" subtitle={`${filteredCards.length} cards`}>
        {filteredCards.map((card) => (
          <CardListItem
            key={card.cardId}
            card={card}
            showDetail={showDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}