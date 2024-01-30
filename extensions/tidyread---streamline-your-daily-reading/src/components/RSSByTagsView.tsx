import { Action, Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SourceWithStatus } from "../types";
import { CATEGORIES_MAP } from "../const";
import CustomActionPanel from "./CustomActionPanel";
import RSSPlainListView from "./RSSPlainListView";
import { requestWithFallback } from "../utils/request";

const extractUniqueTags = (items: SourceWithStatus[]): string[] => {
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
      "https://raw.githubusercontent.com/DophinL/tidyread-cloud/main/data/rss.json",
      "https://tidyread-pub.s3.us-west-2.amazonaws.com/rss.json",
    )
      .then((res) => res.json())
      .then((res) => {
        const resp = res as SourceWithStatus[];
        return extractUniqueTags(resp.filter((item) => item.status !== "failed"));
      })) as string[];

    return resp;
  });

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search Tag"
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
          content={CATEGORIES_MAP[val]}
        />
      ))}
    </Grid>
  );
}
