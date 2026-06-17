import { Icon, List } from "@raycast/api";
import { FeedType } from "../types";

export function FavoritesDropdown(props: { filterSelection: (val: FeedType) => void }) {
  const listOfFilterOptions = [
    { name: "Queue", icon: Icon.List },
    { name: "Favorites", icon: Icon.Star },
  ];

  return (
    <List.Dropdown
      tooltip="Filter articles"
      storeValue={false}
      onChange={(newValue) => {
        props.filterSelection(newValue === "Queue" ? FeedType.Queue : FeedType.Favorites);
      }}
    >
      <List.Dropdown.Section>
        {listOfFilterOptions.map((articleType) => (
          <List.Dropdown.Item
            key={articleType.name}
            icon={articleType.icon}
            title={articleType.name}
            value={articleType.name}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
