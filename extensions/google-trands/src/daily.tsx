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
import { Daily } from "./daily";
import { Trend, TrendItem } from "./trend";

export default function DailyList() {
  const [state, setState] = useState<Trend[]>();

  useEffect(() => {
    async function fetch() {
      const trends = await fetchTrends();
      setState(trends);
    }
    fetch();
  }, []);

  return (
    <List isLoading={state === undefined}>
      {state?.map((trend) => (
        <List.Section title={trend.date} key={trend.date}>
          {trend.items.map((item) => (
            <TrendListItem key={item?.id} data={item} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TrendListItem(props: { data: TrendItem }) {
  const trendItem = props.data;
  const article = decode(trendItem.article);
  const keyword = article.split(" ");
  return (
    <List.Item
      id={trendItem.id + ""}
      title={trendItem.name}
      keywords={keyword}
      subtitle={trendItem.formattedTraffic}
      accessoryTitle={article}
      icon={{ source: `${trendItem.idx}.png`, mask: ImageMask.RoundedRectangle }}
      accessoryIcon={{
        source: trendItem.imageUrl,
        mask: ImageMask.RoundedRectangle,
      }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Open Article in Browser" url={trendItem.articleUrl} />
          <OpenInBrowserAction title="Open Trend in Browser" url={trendItem.trendUrl} />
        </ActionPanel>
      }
    />
  );
}

async function fetchTrends(): Promise<Trend[]> {
  try {
    const preferences = getPreferenceValues();

    const res = await axios.get(
      `https://trends.google.com/trends/api/dailytrends?hl=${preferences.lang}&tz=-540&geo=${preferences.country_daily}`
    );
    const trendData: Daily = JSON.parse(res.data.replace(")]}',", ""));

    const result: Trend[] = [];
    let lastIndex = 0;

    trendData.default.trendingSearchesDays.forEach((day) => {
      const newItem: Trend = {
        date: day.formattedDate,
        items: [],
      };
      result.push(newItem);
      day.trendingSearches.forEach((item, index) => {
        newItem.items.push({
          id: lastIndex++,
          idx: index < 9 ? String(++index) : "etc",
          name: item.title.query,
          formattedTraffic: item.formattedTraffic,
          article: item.articles[0].title,
          articleUrl: item.articles[0].url,
          imageUrl: item.image.imageUrl ?? "",
          trendUrl: "https://trends.google.com" + item.title.exploreLink,
        });
      });
    });

    return result;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load trends");
    return Promise.resolve([]);
  }
}
