import { Color, List } from "@raycast/api";
import React, { useState } from "react";
import { getBunches } from "./hooks/hooks";
import { ActionOnBunches } from "./components/action-on-bunches";
import { EmptyView } from "./components/empty-view";
import { bunchesTag } from "./utils/constants";

export default function SearchAllBunches() {
  const [filter, setFilter] = useState<string>("");
  const [searchContent, setSearchContent] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const { bunches, loading } = getBunches(refresh, searchContent);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search bunches name, tag:tag1+tag2, tag:tag1,tag2"}
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"} storeValue={false}>
          {bunchesTag.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchContent}
      enableFiltering={!searchContent.startsWith("tag:")}
    >
      <EmptyView title={"No Bunches"} />
      <List.Section title={"Open"}>
        {bunches.map((value, index) => {
          return (
            (filter === bunchesTag[0].value || filter === value.isOpen + "") &&
            value.isOpen && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.isOpen ? Color.Green : undefined }}
                key={index}
                title={value.name}
                actions={<ActionOnBunches bunches={value} setRefresh={setRefresh} />}
              />
            )
          );
        })}
      </List.Section>
      <List.Section title={"Closed"}>
        {bunches.map((value, index) => {
          return (
            (filter === bunchesTag[0].value || filter === value.isOpen + "") &&
            !value.isOpen && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.isOpen ? Color.Green : undefined }}
                key={index}
                title={value.name}
                actions={<ActionOnBunches bunches={value} setRefresh={setRefresh} />}
              />
            )
          );
        })}
      </List.Section>
    </List>
  );
}
