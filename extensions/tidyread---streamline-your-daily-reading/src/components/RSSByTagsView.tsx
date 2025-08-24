import { Action, Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ExternalSource } from "../types";
import { CATEGORIES_EMOJI_MAP, CATEGORIES_WEIGHT_MAP } from "../const";
import CustomActionPanel from "./CustomActionPanel";
import RSSPlainListView from "./RSSPlainListView";
import { requestWithFallback } from "../utils/request";

const extractUniqueTags = (items: ExternalSource[]): string[] => {
  const tagsSet = new Set<string>();

  items.forEach((item) => {
    if (item.tags) {
      item.tags.forEach((tag) => {
        tagsSet.add(tag);
      });
    }
  });

  return Array.from(tagsSet);
};

export default function RSSByTagsView(props: { searchBarAccessory: List.Props["searchBarAccessory"] }) {
  const { searchBarAccessory } = props;

  const { data, isLoading } = useCachedPromise(async () => {
    const resp = (await requestWithFallback(
      // "http://127.0.0.1:8080/rss.json",
      "https://raw.githubusercontent.com/DophinL/tidyread-cloud/main/data/rss.json",
      "https://tidyread-pub.s3.us-west-2.amazonaws.com/rss.json",
    )
      .then((res) => res.json())
      .then((res) => {
        const resp = res as ExternalSource[];
        return extractUniqueTags(resp.filter((item) => item.available ?? true)).sort(
          (a, b) => (CATEGORIES_WEIGHT_MAP[b] ?? 1) - (CATEGORIES_WEIGHT_MAP[a] ?? 1),
        );
      })) as string[];

    return resp;
  });

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search tag"
      isLoading={isLoading}
      searchBarAccessory={searchBarAccessory}
    >
      {(data || []).map((val) => (
        <Grid.Item
          actions={
            <CustomActionPanel>
              <Action.Push title="Select" target={<RSSPlainListView filterByTag={val} />}></Action.Push>
            </CustomActionPanel>
          }
          id={val}
          key={val}
          title={val}
          content={CATEGORIES_EMOJI_MAP[val] ?? "💡"}
        />
      ))}
    </Grid>
  );
}
