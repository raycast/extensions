import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useStores } from "./hooks/useStores";
import { StoreForm } from "./components/store-form";
import { WooStore } from "./types/types";

export default function ManageStores() {
  const {
    stores,
    isLoading,
    createStore,
    updateStore,
    deleteStore,
    toggleFavourite,
  } = useStores();

  async function handleDelete(store: WooStore) {
    const alertOptions: Alert.Options = {
      title: `Permanently delete ${store.name}?`,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await deleteStore(store.id);
          showToast({
            title: "Store Deleted",
            message: `${store.name} has been deleted.`,
            style: Toast.Style.Success,
          });
        },
      },
      dismissAction: {
        title: "Cancel",
        onAction: () => {
          showToast({
            title: "Canceled",
            message: `${store.name} was not deleted.`,
            style: Toast.Style.Failure,
          });
        },
      },
    };
    await confirmAlert(alertOptions);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search stores..."
      throttle
    >
      <List.Section title="Manage your stores">
        {stores.map((store) => (
          <List.Item
            key={store.id}
            title={store.name}
            subtitle={store.storeUrl}
            accessories={store.favourite ? [{ icon: Icon.Star }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Store"
                  icon={Icon.Pencil}
                  target={
                    <StoreForm
                      store={store}
                      submitAction={updateStore}
                      action="update"
                    />
                  }
                />
                <Action
                  title="Favorite"
                  icon={Icon.Star}
                  onAction={() => toggleFavourite(store.id)}
                />
                <Action
                  title="Delete Store"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(store)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Item
          title="Add New Store"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Store"
                icon={Icon.Plus}
                target={<StoreForm submitAction={createStore} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
