import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "react-query";
import { ActionGoRetrac } from "./components/action-go-retrac";
import { ListEmptyView } from "./components/list-empty-view";
import { useDeleteItem, useGetAllItems } from "./utils/api";
import { Item } from "./utils/types";
import { AxiosResponse } from "axios";

const queryClient = new QueryClient();
export default function SearchItemsWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchItems />
    </QueryClientProvider>
  );
}
function SearchItems() {
  const { data: allItems, isLoading } = useGetAllItems();

  const { mutateAsync: deleteItem, isLoading: isDeleting } = useDeleteItem();


  async function confirmAndDelete(item: Item, deleteItem: (itemId: string) => Promise<AxiosResponse>) {
    if (
      await confirmAlert({
        title: `Delete '${item.sku}'?`,
        message: `id: ${item.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        const response = await deleteItem(item.id);
        if (response.status === 200) {
          await showToast(Toast.Style.Success, "Deleted item");
        } else {
          await showToast(Toast.Style.Failure, "Failed to delete item");
        }
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to delete item");
      }
    }
  }

  return (
    <List
      isLoading={isLoading || isDeleting}
      isShowingDetail={allItems?.length !== 0 && true}
      searchBarPlaceholder={"Search items"}
    >
      <ListEmptyView title={"No Items"} icon={Icon.Info} />
      {allItems?.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={Icon.Info}
            title={value.sku + " -- " + value.description}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Item Code"} text={value.sku} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Description"} text={value.description} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title={"Quantity"} text={value.quantity + ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Cost"} text={value.cost + ""} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={value.createdAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={value.updatedAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy SKU"} content={value.sku} />
                <Action
                  icon={Icon.Trash}
                  title={"Delete Item"}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => confirmAndDelete(value, deleteItem)}
                />
                <ActionGoRetrac />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
