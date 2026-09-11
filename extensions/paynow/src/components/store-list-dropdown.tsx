import { List } from "@raycast/api";
import { useStore } from "../providers/store-provider/store-provider";
import { useStores } from "../providers/stores-provider/stores-provider";

const StoreListDropdown = () => {
  const { stores } = useStores();
  const { store, setStore } = useStore();

  if (!store || stores.length <= 1) return null;

  return (
    <List.Dropdown id="store-dropdown" tooltip="Select Store" value={store.id} onChange={setStore}>
      {stores.map((store) => (
        <List.Dropdown.Item key={store.id} title={store.name} value={store.id} keywords={[store.name, store.slug]} />
      ))}
    </List.Dropdown>
  );
};

export default StoreListDropdown;
