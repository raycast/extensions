import { Action, LaunchType, List, launchCommand, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { requestWithFallback } from "../utils/request";
import { SourceWithStatus } from "../types";
import RSSListItem from "./RSSListItem";
import { useState } from "react";
import CustomActionPanel from "./CustomActionPanel";
import SourceForm from "./SourceForm";

export default function RSSPlainListView(props: {
  searchBarAccessory?: List.Props["searchBarAccessory"];
  filterByTag?: string;
}) {
  const { searchBarAccessory } = props;
  const [selectId, setSelectId] = useState<string>("");
  const { data, isLoading } = useCachedPromise(async () => {
    const resp = (await requestWithFallback(
      // "http://127.0.0.1:8080/rss.json",
      "https://raw.githubusercontent.com/DophinL/tidyread-cloud/main/data/rss.json",
      "https://tidyread-pub.s3.us-west-2.amazonaws.com/rss.json",
    )
      .then((res) => res.json())
      .then((res) => {
        const resp = res as SourceWithStatus[];
        return resp
          .filter((item) => item.status !== "failed")
          .filter((item) => {
            return props.filterByTag ? (item.tags || []).includes(props.filterByTag) : true;
          });
      })) as Partial<SourceWithStatus>[];

    return resp;
  });

  const manuallyAddActionNode = (
    <Action.Push
      title="Manually Add"
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
      searchBarPlaceholder="Search Source"
      isShowingDetail
      searchBarAccessory={searchBarAccessory}
      // selectedItemId={selectId}
      onSelectionChange={(id) => {
        setSelectId(id!);
      }}
    >
      {
        <List.EmptyView
          actions={<CustomActionPanel>{manuallyAddActionNode}</CustomActionPanel>}
          title="No Source Found"
          description="Press `Enter` to add a source manually."
        />
      }
      {(data || []).map((item) => {
        return <RSSListItem item={item} selected={item.url === selectId} actions={<>{manuallyAddActionNode}</>} />;
      })}
    </List>
  );
}
