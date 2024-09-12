import { List, LaunchProps, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import Items from "./items";
import useGetItems from "./use-get-items";
import getGroupIcon from "./get-group-icon";

export default function BrowseByGroup(props: LaunchProps<{ arguments: Arguments.BrowseByGroup }>) {
  function getRandomGroup() {
    const groups = [
      "12-startups-in-12-months",
      "building-in-public",
      "developers",
      "growth",
      "ideas-and-validation",
      "no-code",
    ];
    const random = groups[Math.floor(Math.random() * groups.length)];
    showToast(Toast.Style.Success, "Show articles in random group", random);
    return random;
  }
  const [group] = useState<string>(props.arguments.group_slug || props.arguments.popular_group || getRandomGroup());

  const [isShowingDetail] = useCachedState("show-details", false);

  const { isLoading, items } = useGetItems(`https://ihrss.io/group/${group}`);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search posts in ${group}`} isShowingDetail={isShowingDetail}>
      <Items items={items} icon={getGroupIcon(group)} />
    </List>
  );
}
