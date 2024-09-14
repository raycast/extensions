import { LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import Items from "./items";
import useGetItems from "./use-get-items";
import getTimeTitle from "./get-time-title";

export default function BrowseByTime(props: LaunchProps<{ arguments: Arguments.BrowseByTime }>) {
  const [time, setTime] = useState(props.arguments.time || "today");
  const [isShowingDetail] = useCachedState("show-details", false);

  const { isLoading, items } = useGetItems(`https://ihrss.io/top/${time}`);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${getTimeTitle(time)} posts`}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" defaultValue={time} onChange={(newTime) => setTime(newTime as Arguments.BrowseByTime["time"])}>
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="This Week" value="week" />
          <List.Dropdown.Item title="This Month" value="month" />
          <List.Dropdown.Item title="All Time" value="all-time" />
        </List.Dropdown>
      }
    >
      <Items items={items} />
    </List>
  );
}
