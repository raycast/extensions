import { Icon, List } from "@raycast/api";

export function FavoritesDropdown(props: { filterSelection: (val: string) => void }) {
  const listOfFilterOptions = [
    { id: "All", icon: Icon.List },
    { id: "Favorites", icon: Icon.Star },
  ];

  return (
    <List.Dropdown
      tooltip="Filter articles"
      storeValue={false}
      onChange={(newValue) => {
        props.filterSelection(newValue);
      }}
    >
      <List.Dropdown.Section>
        {listOfFilterOptions.map((articleType) => (
          <List.Dropdown.Item
            key={articleType.id}
            icon={articleType.icon}
            title={articleType.id}
            value={articleType.id}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
