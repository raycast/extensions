import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useStores } from "../hooks/useStores";
import { StoreForm } from "../components/store-form";
import type { ComponentType } from "react";
import type { WooStore } from "../types/types";

interface StoreSelectionProps {
  stores: ReturnType<typeof useStores>["stores"];
  isLoading: ReturnType<typeof useStores>["isLoading"];
  createStore: ReturnType<typeof useStores>["createStore"];
  updateStore: ReturnType<typeof useStores>["updateStore"];
  Target: ComponentType<{ store: WooStore }>;
}

export function StoreSelection({ stores, isLoading, createStore, updateStore, Target }: StoreSelectionProps) {
  if (!isLoading && stores.length === 1) {
    return <Target store={stores[0]} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search stores..." throttle>
      {stores.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Stores Found"
          description="Press Enter to add your first store."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Store"
                icon={Icon.Plus}
                target={<StoreForm submitAction={createStore} action="create" />}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section title="Select Store">
        {stores.map((store) => (
          <List.Item
            key={store.id}
            title={store.name}
            subtitle={store.storeUrl}
            accessories={store.favourite ? [{ icon: Icon.Star }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Select Store" icon={Icon.Check} target={<Target store={store} />} />
                <Action.Push
                  title="Edit Store"
                  icon={Icon.Pencil}
                  target={<StoreForm store={store} submitAction={updateStore} action="update" />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
