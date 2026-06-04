import { OrdersList } from "./search-orders";

export default function SearchPendingPaymentOrders() {
  return (
    <OrdersList
      status="pending"
      searchBarPlaceholder="Search pending payment orders by customer, email, product, or order number..."
      emptyTitle="No pending payment orders found"
      emptyDescription="Try a different search or check the extension preferences."
    />
  );
}
