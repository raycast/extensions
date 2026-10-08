import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getGameNews, newsText } from "../lib/news";
import { formatSteamTimestamp } from "../lib/users";

export const GameNews = ({ appid, name }: { appid: number; name?: string }) => {
  const { data, isLoading } = useCachedPromise((id: number) => getGameNews(id, { count: 20 }), [appid]);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={name ? `${name} News` : "Game News"}>
      <List.EmptyView icon={Icon.Megaphone} title={isLoading ? "Loading News…" : "No News for This Game"} />
      {data?.map((item) => (
        <List.Item
          key={item.gid}
          title={item.title}
          detail={
            <List.Item.Detail
              markdown={`## ${item.title}\n\n${newsText(item.contents)}`}
              metadata={
                <List.Item.Detail.Metadata>
                  {item.feedlabel ? <List.Item.Detail.Metadata.Label title="Source" text={item.feedlabel} /> : null}
                  <List.Item.Detail.Metadata.Label title="Date" text={formatSteamTimestamp(item.date)} />
                  {item.author ? <List.Item.Detail.Metadata.Label title="Author" text={item.author} /> : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard icon={Icon.Link} title="Copy Link" content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
