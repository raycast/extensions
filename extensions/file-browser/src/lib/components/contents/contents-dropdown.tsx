import { Icon } from "@raycast/api";
import { useState } from "react";
import type { ContentDropdownProps, ContentsViewMode } from "./types";
import { buildDisplayValue, buildSummaryLabel, parseDropdownChange, sortValue, viewValue } from "./dropdown-state";
import { useContentsView } from "./contents";
import { getSortOptions } from "$lib/sort-contract";

const viewOptions: Array<{ label: string; value: ContentsViewMode; icon: Icon }> = [
  { label: "List", value: "list", icon: Icon.AppWindowList },
  { label: "Grid", value: "grid", icon: Icon.AppWindowGrid3x3 },
];

const sortEntries = getSortOptions();

export const ContentsDropdown = ({ view, sort, onViewChange, onSortChange }: ContentDropdownProps) => {
  const { Dropdown: DropdownComponent } = useContentsView();
  const summaryLabel = buildSummaryLabel(view, sort);
  const [nonce, setNonce] = useState(0);
  const displayValue = buildDisplayValue(view, sort, nonce);

  const handleChange = (newValue: string) => {
    const change = parseDropdownChange(newValue);
    if (change.type === "view") {
      onViewChange(change.value);
    } else if (change.type === "sort") {
      onSortChange(change.value);
    }
    setNonce((n) => n + 1);
  };

  return (
    <DropdownComponent tooltip="Change View or Sort" value={displayValue} storeValue={false} onChange={handleChange}>
      <DropdownComponent.Item value={displayValue} title={summaryLabel} />
      <DropdownComponent.Section title="􀦍 View">
        {viewOptions.map((option) => (
          <DropdownComponent.Item
            key={option.value}
            title={option.label}
            value={viewValue(option.value)}
            icon={option.icon}
          />
        ))}
      </DropdownComponent.Section>
      <DropdownComponent.Section title="􀵬 Sort By">
        {sortEntries.map((entry) => (
          <DropdownComponent.Item
            key={entry.id}
            title={entry.label}
            value={sortValue(entry.id)}
            icon={sort === entry.id ? Icon.Cd : Icon.Circle}
          />
        ))}
      </DropdownComponent.Section>
    </DropdownComponent>
  );
};
