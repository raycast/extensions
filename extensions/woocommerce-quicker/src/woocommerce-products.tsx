import { SearchProducts } from "./components/search-products";
import { StoreSelection } from "./components/store-selection";
import { useStores } from "./hooks/useStores";

export default function WooCommerceProducts() {
  const { stores, isLoading, createStore, updateStore } = useStores();

  return (
    <StoreSelection
      stores={stores}
      isLoading={isLoading}
      createStore={createStore}
      updateStore={updateStore}
      Target={SearchProducts}
    />
  );
}
