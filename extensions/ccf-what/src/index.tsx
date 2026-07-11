import {
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  showToast,
  openExtensionPreferences,
  Toast,
} from "@raycast/api";
import { usePromise, useFrecencySorting, useCachedState, useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { fetch } from "cross-fetch";
import * as CONST from "./const";

export default function Command() {
  const localization = getPreferenceValues().Localization == "en" ? false : true;
  const interval = getPreferenceValues().UpdateInterval ?? CONST.DEFAULT_FETCH_INTERVAL;
  const fetchURL = getPreferenceValues().UpdateURL ?? CONST.DEFAULT_FETCH_URL;

  const abortable = useRef<AbortController>();
  const [showingDetail, setShowingDetail] = useCachedState("showingDetail", true);
  const [showingSubtitle, setShowingSubtitle] = useCachedState("showingSubtitle", false);
  const [lastFetch, setLastFetch] = useCachedState<number>("lastFetch", 0);
  const { isLoading, data, revalidate } = useCachedPromise(
    async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing data",
        primaryAction: {
          title: "Open Preference",
          onAction: (toast) => {
            toast.hide();
            openExtensionPreferences();
          },
        },
      });
      try {
        const res = await fetch(fetchURL, { signal: abortable.current?.signal });
        const jsonObj = await res.json();
        const now = new Date();
        setLastFetch(now.getTime());
        toast.style = Toast.Style.Success;
        toast.title = "Data fetched from " + fetchURL;
        return jsonObj as unknown as CCFRanking | undefined;
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetch failed.";
        toast.message = (err as Error).message;
      }
    },
    [],
    { keepPreviousData: true, execute: false },
  );
  const { isLoading: isChecking } = usePromise(async () => {
    const diff = new Date().getTime() - lastFetch;
    const itvl = CONST.parseInterval(interval);
    if (lastFetch === 0 || (itvl > 0 && diff > itvl)) {
      await revalidate();
    }
  });
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data?.list, { key: (item) => item.id });

  return (
    <List
      isLoading={isLoading || isChecking}
      isShowingDetail={showingDetail}
      filtering={true}
      navigationTitle={data ? `Last updated at ${new Date(lastFetch).toLocaleDateString()}` : "No data..."}
      searchBarPlaceholder="Your paper is accepted by?"
    >
      {sortedData.map((item) => PublicationListItem(item))}
    </List>
  );

  function PublicationListItem(props: Publication) {
    const tier_icons = CONST.TIER_ICON[props.rank];
    const type_icons = CONST.TYPE_ICON[props.type];
    const toggle_icons = CONST.TOGGLE_ICON;
    const category = data?.category[props.category_id];
    return (
      <List.Item
        key={props.id}
        icon={{ source: tier_icons }}
        keywords={[props.abbr, props.name, category?.english ?? "no category", category?.chinese ?? "无分类"]}
        title={props.abbr}
        subtitle={showingSubtitle ? props.name : undefined}
        accessories={[{ icon: { source: type_icons } }, { text: localization ? category?.chinese : category?.english }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Search in DBLP"
              url={`https://dblp.uni-trier.de/search?q=${props.abbr}`}
              onOpen={() => visitItem(props)}
            />
            <Action
              title="Toggle Detail"
              icon={{ source: toggle_icons }}
              shortcut={{ modifiers: ["cmd"], key: "/" }}
              onAction={() => {
                setShowingDetail(!showingDetail);
                setShowingSubtitle(!showingSubtitle);
              }}
            />
            <Action.CopyToClipboard
              content={props.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onCopy={() => visitItem(props)}
            />
            <Action
              title="Refetch Ranking Data"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => revalidate()}
            />
            <Action
              title="Reset Frequency"
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => resetRanking(props)}
            />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Abbreviation" text={props.abbr} />
                <List.Item.Detail.Metadata.Label title="Name" text={props.name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Tier" icon={{ source: tier_icons }} />
                <List.Item.Detail.Metadata.Label
                  title="Category"
                  text={localization ? category?.chinese : category?.english}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  icon={{ source: type_icons }}
                  text={localization ? CONST.TYPE_LOCALIZATION[props.type] : props.type}
                />
                <List.Item.Detail.Metadata.Label title="Publisher" text={props.publisher} />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }
}
