import { OrdersList } from "./search-orders";

export default function SearchAbandonedCarts() {
  return (
    <OrdersList
      status="checkout-draft"
      searchBarPlaceholder="Search abandoned carts by customer, email, product, or order number..."
      emptyTitle="No abandoned carts found"
      emptyDescription="WooCommerce exposes abandoned carts as checkout drafts when available."
    />
  );
}
