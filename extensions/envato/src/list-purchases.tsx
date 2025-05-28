import { ActionPanel, Action, Icon, List, Keyboard, showToast, Toast, open } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { envato } from "./utils";
import { ItemDetail } from "./itemDetail";

export default function ListPurchases() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-purchase-details", false);
  const { isLoading, data: purchases } = useCachedPromise(
    async () => {
      const res = await envato.private.getPurchases({ include_all_item_details: true });
      return res.results;
    },
    [],
    {
      initialData: [],
    }
  );

  async function download(id: number) {
    const toast = await showToast(Toast.Style.Animated, "Starting Download");
    const res = await envato.private.getDownloadLink({ item_id: id });
    toast.style = Toast.Style.Success;
    toast.title = "Download Started";
    await open(res);
  }

  const isEmpty = !isLoading && !purchases.length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your purchases"
      isShowingDetail={!isEmpty && isShowingDetail}
    >
      {isEmpty ? (
        <List.EmptyView
          title="You haven't bought anything yet."
          description="Discover the most popular items available or browse our hottest new items."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon="icon.png"
                title="Most Popular Items"
                url="https://themeforest.net/page/top_sellers"
              />
              <Action.OpenInBrowser
                icon="icon.png"
                title="Hottest New Items"
                url="https://themeforest.net/category/all"
              />
            </ActionPanel>
          }
        />
      ) : (
        purchases.map((purchase) => (
          <List.Item
            key={purchase.code}
            icon={purchase.item.previews.icon_preview?.icon_url ?? Icon.Dot}
            title={purchase.item.name}
            subtitle={isShowingDetail ? undefined : purchase.license}
            accessories={
              isShowingDetail ? undefined : [{ date: purchase.sold_at, tooltip: purchase.sold_at.toString() }]
            }
            detail={<ItemDetail item={purchase.item} />}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action icon={Icon.Download} title="Download" onAction={() => download(purchase.item.id)} />
                <Action.OpenInBrowser
                  icon="icon.png"
                  url={purchase.item.url}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
