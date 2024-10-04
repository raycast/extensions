import { List, LaunchProps, getPreferenceValues, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import Items from "./items";
import useGetItems from "./use-get-items";
import getGroupIcon from "./get-group-icon";
import groups from "./groups.json";

export default function BrowsePosts(props: LaunchProps<{ arguments: Arguments.BrowsePosts }>) {
  const { group_slug } = props.arguments;
  const { default_type } = getPreferenceValues<Preferences.BrowsePosts>();

  const [type, setType] = useState(group_slug ? `group_${group_slug}` : default_type);
  const [endpoint, setEndpoint] = useState("");
  const [searchBarPlaceholder, setSearchBarPlaceholder] = useState("");
  const [isShowingDetail] = useCachedState("show-details", false);

  const { isLoading, items } = useGetItems(`https://ihrss.io/${endpoint}`);

  useEffect(() => {
    if (type.startsWith("group_")) {
      const group_slug = type.replace("group_", "");
      setEndpoint(`group/${group_slug}`);
      setSearchBarPlaceholder(`Search posts in "${groups.find((g) => g.slug === group_slug)?.name}"`);
    } else if (type.startsWith("time_")) {
      const time = type.replace("time_", "");
      setEndpoint(`top/${time}`);
      let timeText = "";
      if (time === "today") timeText = "today's";
      else if (time === "week") timeText = "this week's";
      else if (time === "month") timeText = "this month's";
      else if (time === "all-time") timeText = "all-time";
      setSearchBarPlaceholder(`Search ${timeText} posts`);
    } else {
      const replaced = type.replace("type_", "");
      setEndpoint(replaced);
      setSearchBarPlaceholder(`Search ${replaced} posts`);
    }
  }, [type]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" defaultValue={type} onChange={setType}>
          <List.Dropdown.Section title="Time">
            <List.Dropdown.Item icon={Icon.Calendar} title="Today" value="time_today" />
            <List.Dropdown.Item icon={Icon.Calendar} title="This Week" value="time_week" />
            <List.Dropdown.Item icon={Icon.Calendar} title="This Month" value="time_month" />
            <List.Dropdown.Item icon={Icon.Calendar} title="All Time" value="time_all-time" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item icon={Icon.Leaf} title="Organic" value="type_organic" />
            <List.Dropdown.Item icon={Icon.Leaf} title="Featured" value="type_featured" />
            <List.Dropdown.Item icon={Icon.Leaf} title="Newest" value="type_newest" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Group">
            {groups.map((group) => (
              <List.Dropdown.Item
                key={group.name}
                icon={getGroupIcon(group.slug)}
                title={group.name}
                value={`group_${group.slug}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <Items
        items={items}
        icon={type.startsWith("group_") ? getGroupIcon(type.replace("group_", "")) : "indie-hackers.png"}
      />
    </List>
  );
}
