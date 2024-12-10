import { Icon, List } from "@raycast/api";
import useGet from "./hooks";
import { useState } from "react";
import { Item } from "./types";

export default function Providers() {
  const [item, setItem] = useState("");
  
  const { isLoading, data: items } = useGet<Item>(item);

  return <List isLoading={isLoading} searchBarAccessory={<List.Dropdown tooltip="Item" onChange={setItem} storeValue>
    <List.Dropdown.Item title="Locations" value="locations" />
    <List.Dropdown.Item title="OS" value="os" />
    <List.Dropdown.Item title="Providers" value="providers" />
  </List.Dropdown>}>
    <List.Section title={item} subtitle={items.length.toString()}>
    {items.map(item => <List.Item key={item.id} icon={Icon.Dot} title={item.name} />)}
    </List.Section>
  </List>
}