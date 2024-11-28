import React, { useState } from "react";
import { List } from "@raycast/api";
import { ModuleDoc, GenericType } from "../types";
import { ListItems } from "../components/ListItems";
import { TypeDropdown } from "../components/TypeDropdown";
import { TYPE_LABEL } from "../utils";

export function ModuleDetail({ module }: { module: ModuleDoc }) {
  const [types, setTypes] = useState(Object.values(GenericType));

  return (
    <List
      searchBarPlaceholder="Search function"
      navigationTitle={module.name}
      searchBarAccessory={<TypeDropdown onChange={setTypes} />}
    >
      {Object.values(GenericType).map(
        (type) =>
          types.includes(type) && (
            <List.Section title={TYPE_LABEL[type]} key={type}>
              <ListItems module={module} type={type} />
            </List.Section>
          ),
      )}
    </List>
  );
}
