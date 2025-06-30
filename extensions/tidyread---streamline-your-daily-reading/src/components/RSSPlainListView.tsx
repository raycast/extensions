import { Action, LaunchType, List, launchCommand, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { requestWithFallback } from "../utils/request";
import { ExternalSource } from "../types";
import RSSListItem from "./RSSListItem";
import { useState } from "react";
import CustomActionPanel from "./CustomActionPanel";
import SourceForm from "./SourceForm";

export default function RSSPlainListView(props: {
  searchBarAccessory?: List.Props["searchBarAccessory"];
  filterByTag?: string;
  defaultSearchText?: string;
}) {
  const { searchBarAccessory, filterByTag, defaultSearchText } = props;
  const [selectId, setSelectId] = useState<string>("");
  const { data, isLoading } = useCachedPromise(async () => {
    const resp = (await requestWithFallback(
      // "http://127.0.0.1:8080/rss.json",
      "https://raw.githubusercontent.com/DophinL/tidyread-cloud/main/data/rss.json",
      "https://tidyread-pub.s3.us-west-2.amazonaws.com/rss.json",
    )
      .then((res) => res.json())
      .then((res) => {
        const resp = res as ExternalSource[];
        return resp
          .filter((item) => item.available ?? true)
          .filter((item) => {
            return filterByTag ? (item.tags || []).includes(filterByTag) : true;
          })
          .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
      })) as Partial<ExternalSource>[];

    return resp;
  });

  const manuallyAddActionNode = (
    <Action.Push
      title="Manually Add"
      icon="hand.svg"
      target={
        <SourceForm
          onSuccess={async () => {
            await popToRoot();
            await launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
          }}
        />
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search source, or press `⌘ + Enter` to manually add"
      isShowingDetail
      searchText={defaultSearchText}
      searchBarAccessory={searchBarAccessory}
      // selectedItemId={selectId}
      onSelectionChange={(id) => {
        setSelectId(id!);
      }}
    >
      {
        <List.EmptyView
          actions={
            <CustomActionPanel>
              {manuallyAddActionNode}
              <Action.OpenInBrowser title="Request A New Source" url="https://tally.so/r/wkEoz6"></Action.OpenInBrowser>
            </CustomActionPanel>
          }
          title="No Source Found"
          description="Press `Enter` to add a source manually. Or Press `⌘ + Enter` to request a new source"
        />
      }
      {(data || []).map((item) => {
        return (
          <RSSListItem
            key={item.url}
            item={item}
            selected={item.url === selectId}
            actions={<>{manuallyAddActionNode}</>}
          />
        );
      })}
    </List>
  );
}
