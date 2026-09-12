import {
  ActionPanel,
  getPreferenceValues,
  ImageMask,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import axios from "axios";
import { decode } from "html-entities";
import { useEffect, useState } from "react";
import { Realtime } from "./realtime";
import { TrendItem } from "./trend";

export default function RealTimeList() {
  const [state, setState] = useState<TrendItem[]>();

  useEffect(() => {
    async function fetch() {
      const trends = await fetchTrends();
      setState(trends);
    }
    fetch();
  }, []);

  return (
    <List isLoading={state === undefined}>
      {state?.map((item) => (
        <TrendListItem key={item?.id} data={item} />
      ))}
    </List>
  );
}

function TrendListItem(props: { data: TrendItem }) {
  const trendItem = props.data;
  const article = decode(trendItem.article);
  return (
    <List.Item
      id={trendItem.id + ""}
      title={trendItem.name}
      keywords={trendItem.keyword}
      accessoryTitle={article}
      icon={{ source: `${trendItem.idx}.png`, mask: ImageMask.RoundedRectangle }}
      accessoryIcon={{
        source: trendItem.imageUrl,
        mask: ImageMask.RoundedRectangle,
      }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            title="Open Article in Browser"
            url={trendItem.articleUrl}
            icon={{ source: trendItem.imageUrl, mask: ImageMask.RoundedRectangle }}
          />
          <OpenInBrowserAction
            title="Open Trend in Browser"
            url={trendItem.trendUrl}
            icon={{ source: `Icon.png`, mask: ImageMask.RoundedRectangle }}
          />
        </ActionPanel>
      }
    />
  );
}

async function fetchTrends(): Promise<TrendItem[]> {
  try {
    const preferences = getPreferenceValues();

    const res = await axios.get(
      `https://trends.google.com/trends/api/realtimetrends?hl=${preferences.lang}&tz=-540&cat=all&fi=0&fs=0&geo=${preferences.country}&ri=300&rs=100&sort=0`,
    );
    const trendData: Realtime = JSON.parse(res.data.replace(")]}'", ""));

    const result: TrendItem[] = [];

    trendData.storySummaries.trendingStories.forEach((item, index) => {
      const newItem: TrendItem = {
        id: index,
        idx: index < 9 ? String(++index) : "etc",
        name: item.title,
        article: item.articles[0].articleTitle,
        articleUrl: item.image.newsUrl,
        imageUrl: "https:" + item.image.imgUrl,
        trendUrl: item.shareUrl,
        keyword: item.entityNames,
      };

      result.push(newItem);
    });

    return result;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load trends");
    return Promise.resolve([]);
  }
}
