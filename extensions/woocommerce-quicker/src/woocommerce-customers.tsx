import { useStores } from "./hooks/useStores";
import { StoreSelection } from "./components/store-selection";
import { SearchCustomers } from "./components/search-customers";

export default function WooCommerceCustomers() {
  const { stores, isLoading, createStore, updateStore } = useStores();

  return (
    <StoreSelection
      stores={stores}
      isLoading={isLoading}
      createStore={createStore}
      updateStore={updateStore}
      Target={SearchCustomers}
    />
  );
}
