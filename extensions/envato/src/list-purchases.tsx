import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { envato } from "./utils";
import { NodeHtmlMarkdown } from "node-html-markdown";

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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your purchases" isShowingDetail={isShowingDetail}>
      {purchases.map((purchase) => {
        const markdown = `## Description \n\n --- \n ${NodeHtmlMarkdown.translate(purchase.item.description)}`;
        return (
          <List.Item
            key={purchase.code}
            icon={purchase.item.previews.icon_preview?.icon_url ?? Icon.Dot}
            title={purchase.item.name}
            subtitle={isShowingDetail ? undefined : purchase.license}
            accessories={
              isShowingDetail ? undefined : [{ date: purchase.sold_at, tooltip: purchase.sold_at.toString() }]
            }
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={purchase.item.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Name" text={purchase.item.name} />
                    <List.Item.Detail.Metadata.Link
                      title="Author"
                      text={purchase.item.author_username}
                      target={purchase.item.author_url}
                    />
                    <List.Item.Detail.Metadata.Link title="URL" text={purchase.item.url} target={purchase.item.url} />
                    <List.Item.Detail.Metadata.Label
                      title="Supported Until"
                      text={purchase.supported_until.toDateString()}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Site"
                      text={purchase.item.site}
                      target={`https://${purchase.item.site}`}
                    />
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {purchase.item.tags.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.OpenInBrowser icon="icon.png" url={purchase.item.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
