import { List, LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import Items from "./items";
import useGetItems from "./use-get-items";

export default function BrowseByType(props: LaunchProps<{ arguments: Arguments.BrowseByType }>) {
  const [type, setType] = useState<string>(props.arguments.type);
  const [isShowingDetail] = useCachedState("show-details", false);

  const { isLoading, items } = useGetItems(`https://ihrss.io/${type}`);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${type} posts`}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" defaultValue={type} onChange={setType}>
          <List.Dropdown.Item title="Organic" value="organic" />
          <List.Dropdown.Item title="Featured" value="featured" />
          <List.Dropdown.Item title="Newest" value="newest" />
        </List.Dropdown>
      }
    >
      <Items items={items} />
    </List>
  );
}
