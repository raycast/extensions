import { useStores } from "./hooks/useStores";
import { SearchOrders } from "./components/search-orders";
import { StoreSelection } from "./components/store-selection";

export default function WooCommerceOrders() {
  const { stores, isLoading, createStore, updateStore } = useStores();

  return (
    <StoreSelection
      stores={stores}
      isLoading={isLoading}
      createStore={createStore}
      updateStore={updateStore}
      Target={SearchOrders}
    />
  );
}
