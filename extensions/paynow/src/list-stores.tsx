import { Action, ActionPanel, Keyboard, List, showToast, Toast } from "@raycast/api";
import StoreEditor from "./components/store-editor";
import { withProviders } from "./hocs/with-providers";
import { useStore } from "./providers/store-provider/store-provider";
import { useStores } from "./providers/stores-provider/stores-provider";

const ListStoresCommand = () => {
  const { stores, removeStore, isLoading: isLoadingStores } = useStores();
  const { store: currentStore, setStore, isLoading: isLoadingCurrentStore } = useStore();

  return (
    <List
      isLoading={isLoadingStores || isLoadingCurrentStore}
      actions={
        <ActionPanel title="Manage Stores">
          <Action.Push title="Add Store" target={<StoreEditor />} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No stores configured" description="Add a store to get started!" />
      {stores.map((store) => (
        <List.Item
          key={store.id}
          title={store.name}
          subtitle={store.id === currentStore?.id ? "Current Store" : ""}
          actions={
            <ActionPanel title="Manage Store">
              {store.id !== currentStore?.id && (
                <Action
                  title="Set as Current Store"
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onAction={() => setStore(store.id)}
                />
              )}
              <Action.Push
                title="Edit Store"
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<StoreEditor id={store.id} />}
              />
              <Action.Push title="Add Store" target={<StoreEditor />} />
              <Action.CopyToClipboard title="Copy Store ID" content={store.id} />
              <Action
                title="Remove Store"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => {
                  removeStore(store.id);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Store removed!",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default withProviders(ListStoresCommand);
