import { useCallback } from "react";
import { List } from "@raycast/api";
import { QueryOrder } from "../types";
import { sortDropdownItems } from "../constants";

export const SortDropdown = ({
  onSortChange,
  onFilterChange,
}: {
  onSortChange: (newValue: QueryOrder) => void;
  onFilterChange: (newFilter: string) => void;
}) => {
  const handleChange = useCallback(
    (newValue: string) => {
      const isSortByItem = sortDropdownItems[0].items.some((item) => item.value === newValue);

      if (isSortByItem) {
        return onSortChange(newValue as QueryOrder);
      }

      return onFilterChange(newValue);
    },
    [onSortChange, onFilterChange],
  );

  return (
    <List.Dropdown tooltip="Sort" defaultValue="relevance" storeValue={true} onChange={handleChange}>
      {sortDropdownItems.map((section) => (
        <List.Dropdown.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
};
