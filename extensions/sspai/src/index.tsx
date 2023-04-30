import { Action, List, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { xml2json } from "xml-js";

type Result = {
  title: string;
  link: string;
  description: string;
  author: string;
  pubDate: string;
};

type ItemResult = {
  title: { _text: string };
  link: { _text: string };
  description: { _text: string };
  author: { _text: string };
  pubDate: { _text: string };
};

type SearchResult = Result[];

export default function Command() {
  // const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://sspai.com/feed`, {
    execute: true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const results: SearchResult = [];
      const data = await response.text();
      if (data) {
        const jsonResult = xml2json(data, { compact: true, spaces: 4 });
        const rssData = JSON.parse(jsonResult);
        const itemList = rssData.rss.channel.item;
        if (itemList) {
          itemList.forEach((item: ItemResult) => {
            let pubDate = item.pubDate._text;
            pubDate = new Date(pubDate).toLocaleString("zh-CN", { hour12: false });
            results.push({
              title: item.title._text,
              link: item.link._text,
              description: item.description._text,
              author: item.author._text,
              pubDate: pubDate,
            });
          });
        }
      }
      return results;
    },
  });

  return (
    <List
      // isShowingDetail={false}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="SSPAI"
    >
      {data && data.length === 0 ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((result) => (
          <List.Item
            key={result.link}
            title={result.title}
            accessories={[
              // { text: `${result.pubDate}` },
              { date: new Date(result.pubDate) },
            ]}
            subtitle={result.author}
            // icon={{ source: result.cover }}
            // detail={
            //   <List.Item.Detail
            //     markdown={`${result.description}`}
            //     metadata={
            //       <List.Item.Detail.Metadata>
            //         <List.Item.Detail.Metadata.Label title="Types" />
            //       </List.Item.Detail.Metadata>
            //     }
            //     // metadata={showingDetail ? metadata(result) : ''}
            //   />
            // }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={result.link} />
                <Action.CopyToClipboard title="Copy Link" content={result.link} />
                {/*<Action*/}
                {/*  title="Toggle Details"*/}
                {/*  icon={Icon.AppWindowList}*/}
                {/*  shortcut={{ modifiers: ['cmd', 'shift'], key: 'd' }}*/}
                {/*  onAction={() => setShowingDetail(!showingDetail)}*/}
                {/*/>*/}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
