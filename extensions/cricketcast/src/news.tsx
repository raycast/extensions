import { ActionPanel, List, showToast, Action, Icon, Toast } from "@raycast/api";
import convert from "xml-js";
import { useCachedState, useFetch } from "@raycast/utils";
import { NewsItem, RSS } from "./types";

export default function News() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  const { isLoading, data } = useFetch("https://www.espncricinfo.com/rss/content/story/feeds/0.xml", {
    mapResult(result: string) {
      const JSONdata: RSS<NewsItem> = JSON.parse(convert.xml2json(result, { compact: true, spaces: 4 }));
      const news = JSONdata.rss.channel.item.map((article) => ({
        title: article.title["_text"].replace(" *", "*"),
        description: article.description._text,
        icon: article.coverImages._text,
        link: article.link["_text"],
        id: article.guid["_text"].replace(/\D+/g, ""),
        pubDate: article.pubDate._text,
        cover: article["media:content"]._attributes.url.replace("http://", "https://"),
      }));

      return {
        data: news,
      };
    },
    async onWillExecute() {
      await showToast(Toast.Style.Animated, `Fetching latest news items`);
    },
    async onData(data) {
      await showToast(Toast.Style.Success, `Fetched ${data.length} news items`);
    },
    keepPreviousData: true,
    initialData: [],
  });

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search news">
      {data.map((news) => (
        <List.Item
          key={news.id}
          icon={news.icon}
          title={news.title}
          accessories={[{ date: new Date(news.pubDate) }]}
          detail={<List.Item.Detail markdown={`![Cover](${news.cover}) \n\n ${news.description}`} />}
          actions={
            <ActionPanel title={news.title}>
              <ActionPanel.Section>
                <>
                  {news.link && <Action.OpenInBrowser url={news.link} />}
                  {news.link && <Action.CopyToClipboard content={news.link} title="Copy Link" />}
                </>
              </ActionPanel.Section>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
