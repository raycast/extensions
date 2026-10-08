import React, { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { ModuleDoc, GenericType } from "../types";
import { ListItems } from "../components/ListItems";
import { TypeDropdown } from "../components/TypeDropdown";
import { TYPE_LABEL } from "../utils";

export function ModuleDetail({ module }: { module: ModuleDoc }) {
  const [types, setTypes] = useState(Object.values(GenericType));
  const [typeItems, setTypeItems] = useState<JSX.Element[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadItems() {
      const filteredTypes = Object.values(GenericType).filter((type) =>
        types.includes(type),
      );
      const elements = await Promise.all(
        filteredTypes.map((type) => (
          <List.Section title={TYPE_LABEL[type]} key={type}>
            <ListItems module={module} type={type} />
          </List.Section>
        )),
      );

      setTypeItems(elements);
      setIsLoading(false);
    }

    loadItems();
  }, [types, module]);

  return (
    <List
      searchBarPlaceholder="Search function"
      navigationTitle={module.name}
      searchBarAccessory={<TypeDropdown onChange={setTypes} />}
      isLoading={isLoading}
    >
      {typeItems}
    </List>
  );
}
