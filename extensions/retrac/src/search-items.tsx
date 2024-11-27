import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useItems } from "@hooks/use-items";
import { useWorkspaces } from "@hooks/use-workspaces";
import { useState } from "react";
import { RETRAC_APP_URL } from "@utils/constants";
import { deleteItem } from "@/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { ItemSchema } from "@/types";

export default function SearchItems() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const { workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useWorkspaces();
  const { items, error: itemsError, isLoading: isLoadingItems, mutate } = useItems({ workspaceId, workspacesError });

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingItems}
      isShowingDetail={
        !isLoadingWorkspaces && !isLoadingItems && !workspacesError && !itemsError && items?.length !== 0
      }
      searchBarPlaceholder={"Search items by sku, description, cost, supplier, tags..."}
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Workspace"
          placeholder="Select Workspace"
          storeValue
          filtering
          isLoading={isLoadingWorkspaces}
          onChange={setWorkspaceId}
        >
          {(workspaces ?? []).map((w) => (
            <List.Dropdown.Item
              key={w.id}
              title={w.name}
              value={w.id}
              keywords={[w.id, w.name, w.slug]}
              icon={{ source: w.logo ?? "command-icon.png", mask: Image.Mask.Circle }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(workspacesError || itemsError) && (
        <List.EmptyView
          title={workspacesError ? "Failed to fetch workspaces" : "Failed to fetch short links"}
          description={workspacesError?.message ?? itemsError?.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!workspacesError && !itemsError && items?.length === 0 && (
        <List.EmptyView title="No items found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {(items ?? []).map((value) => {
        const { sku, description, cost, supplier, tags, id, userId, user, createdAt, updatedAt } = value;
        const formattedCost = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          Number(cost),
        );
        return (
          <List.Item
            key={sku}
            keywords={[
              sku,
              description,
              cost.toString(),
              supplier ?? "",
              id,
              userId,
              ...(tags ?? []).map((t) => t.name),
            ]}
            icon={{ source: user.image, mask: Image.Mask.Circle }}
            title={sku}
            subtitle={description}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"SKU"} text={sku} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Description"} text={description} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title={"Cost"} text={formattedCost} />
                    <List.Item.Detail.Metadata.Separator />
                    {supplier && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Supplier" text={supplier} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    {tags && tags.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {tags.map((t) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={t.id}
                              text={t.name}
                              icon={Icon.Tag}
                              color={Color.Orange}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label
                      title={"Created By"}
                      text={user.name}
                      icon={{ source: user.image, mask: Image.Mask.Circle }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={createdAt.substring(0, 19).replace("T", " ")}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={updatedAt.substring(0, 19).replace("T", " ")}
                      icon={Icon.Calendar}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy SKU"} content={sku} />
                <Action
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title={"Delete Item"}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteItemModal(id, workspaceId, mutate)}
                />
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Go to Retrac"
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url={RETRAC_APP_URL}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const deleteItemModal = (itemId: string, workspaceId: string, mutate: MutatePromise<ItemSchema[]>) =>
  confirmAlert({
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting item..." });
        await mutate(
          deleteItem({ itemId, workspaceId })
            .then(async ({ id }) => {
              toast.style = Toast.Style.Success;
              toast.title = "✅ Item deleted";
              toast.message = `with id ${id}`;
            })
            .catch(async (err) => {
              await showFailureToast(err, {
                title: "❗ Failed to delete item",
                primaryAction: { title: "Retry", onAction: () => deleteItemModal(itemId, workspaceId, mutate) },
              });
              throw err;
            }),
          { optimisticUpdate: (data) => data?.filter((l) => l.id !== itemId) },
        );
      },
    },
  });
