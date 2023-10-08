import { List } from "@raycast/api";

export function FavoritesDropdown(props: any) {
  const listOfFilterOptions: any[] = [
    { id: "1", name: "All" },
    { id: "2", name: "Favorites" },
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
        {listOfFilterOptions.map((drinkType) => (
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
