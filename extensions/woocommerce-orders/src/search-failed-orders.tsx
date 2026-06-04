import { OrdersList } from "./search-orders";

export default function SearchFailedOrders() {
  return (
    <OrdersList
      status="failed"
      searchBarPlaceholder="Search failed orders by customer, email, product, or order number..."
      emptyTitle="No failed orders found"
      emptyDescription="Try a different search or check the extension preferences."
    />
  );
}
