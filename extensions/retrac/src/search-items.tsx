import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "react-query";
import { ActionGoRetrac } from "./components/action-go-retrac";
import { ListEmptyView } from "./components/list-empty-view";
import { useDeleteItem, useGetAllItems } from "./utils/api";

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

  const { mutate: deleteItem, isLoading: isDeleting } = useDeleteItem();

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
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => deleteItem(value.id)}
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
