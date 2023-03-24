import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import useLists from "../hooks/useLists";
import { ListObject } from "../types/list";
import { getTintColorFromHue, ListColors, ListTypes } from "../utils/list";
import ActionsList from "./ActionsList";

export default function SearchLists() {
  const [searchText, setSearchText] = useState<string>("");
  const [listType, setListType] = useState("all");
  const [filteredList, filterList] = useState<ListObject[]>([]);

  const { listsData, listsIsLoading, listsMutate } = useLists();

  useEffect(() => {
    if (!listsData) return;

    filterList(
      listsData.filter(
        (item) =>
          item?.type === listType &&
          item?.archivedAt === null &&
          item?.name?.toLowerCase().includes(searchText?.toLowerCase())
      ) ?? []
    );
  }, [searchText, listsData, listType]);

  const listArr = filteredList.filter((list) => list?.type === "list");

  const smartListArr = filteredList.filter((list) => list?.type === "smartlist");

  return (
    <List
      isLoading={listsIsLoading}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Lists"
      searchBarPlaceholder="Search your favorite list"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select List Type"
          storeValue={true}
          onChange={(newValue) => {
            setListType(newValue);
          }}
        >
          {ListTypes.map((listType) => (
            <List.Dropdown.Item key={listType.value} title={listType.name} value={listType.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Lists">
        {listArr?.map((list) => (
          <List.Item
            key={list.id}
            icon={{
              source: list.appearance?.iconUrl ?? "list-icons/list.svg",
              tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
            }}
            title={list.name}
            subtitle={list.description}
            actions={<ActionsList list={list} mutateList={listsMutate} />}
          />
        ))}
      </List.Section>
      <List.Section title="Smart Lists">
        {smartListArr?.map((list) => (
          <List.Item
            key={list.id}
            icon={{
              source: list.appearance?.iconUrl ?? "list-icons/list.svg",
              tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
            }}
            title={list.name}
            subtitle={list.description}
            actions={<ActionsList list={list} mutateList={listsMutate} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
