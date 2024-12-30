import { open, List, ActionPanel, Action } from "@raycast/api";
import { useSearch } from "./hooks";

export default function Search(props: SearchProps) {
  const {
    appName,
    arguments: { query },
  } = props;

  const { items, dropdown, isLoading } = useSearch({ appName });
  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isLoading={isLoading}
      searchBarAccessory={<Dropdown {...dropdown} />}
    >
      {items.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => open(item.url)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Dropdown({ value, onChange }: Pick<List.Dropdown.Props, "value" | "onChange">) {
  return (
    <List.Dropdown tooltip="Change network" value={value} onChange={onChange}>
      <List.Dropdown.Item title="Mainnet" value="mainnet-beta" />
      <List.Dropdown.Item title="Devnet" value="devnet" />
    </List.Dropdown>
  );
}

export interface SearchProps {
  appName: string;
}
