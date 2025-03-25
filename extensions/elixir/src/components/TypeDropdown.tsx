import React from "react";
import { GenericType } from "../types";
import { List } from "@raycast/api";

/**
 * Dropdown component to filter the items by type, effectively allowing the user
 * to show either only functions, macros, types, callbacks or all of them.
 *
 * @param onChange Callback function that receives an array of GenericType when selection changes
 * @returns A List.Dropdown JSX element for type selection
 */
export const TypeDropdown = ({
  onChange,
}: {
  onChange: (types: GenericType[]) => void;
}): JSX.Element => {
  return (
    <List.Dropdown
      tooltip="Select Function Type"
      placeholder="Select Function Type"
      storeValue={true}
      onChange={(newValue) => {
        if (newValue === "All") {
          onChange(Object.values(GenericType));
        } else {
          onChange([newValue.toLowerCase() as GenericType]);
        }
      }}
    >
      {/*
       * Raycast does not allow to de-select selected dropdown item, so we need
       * an option in case users want to display all function types again.
       */}
      <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />

      {Object.keys(GenericType).map((type) => {
        return <List.Dropdown.Item key={type} title={type} value={type} />;
      })}
    </List.Dropdown>
  );
};
