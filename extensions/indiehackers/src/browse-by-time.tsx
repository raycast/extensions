import { List, LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import Items from "./items";
import useGetItems from "./use-get-items";

export default function BrowseByTime(props: LaunchProps<{ arguments: Arguments.BrowseByTime }>) {
  const [time, setTime] = useState<string>(props.arguments.time);
  const [isShowingDetail] = useCachedState("show-details", false);

  const { isLoading, items } = useGetItems(`https://ihrss.io/top/${time}`);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search posts"
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" defaultValue={time} onChange={setTime}>
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Week" value="week" />
          <List.Dropdown.Item title="Month" value="month" />
          <List.Dropdown.Item title="All-Time" value="all-time" />
        </List.Dropdown>
      }
    >
      <Items items={items} />
    </List>
  );
}
