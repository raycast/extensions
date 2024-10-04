import { Icon, List } from "@raycast/api";
import { getAccessories, getFlag } from "./utils";
import { OLYMPICS_2024_DATA } from "./Data/2024-medals";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Country">
      {OLYMPICS_2024_DATA?.results?.map((item, index) => (
        <List.Item
          key={index}
          icon={{ source: getFlag(item.country.code), fallback: Icon.Flag }}
          keywords={[item.country.code, item.country.name]}
          title={item.country.code}
          subtitle={item.country.name}
          accessories={getAccessories(item)}
        />
      ))}
    </List>
  );
}
