import { Icon, List } from "@raycast/api";
import { uniqBy } from "lodash";

import { SearchGroupOption } from "../hooks/useSearchGroups";

export const DEFAULT_SEARCH_GROUP_SCOPE = "sn_codesearch";

export const DEFAULT_GROUP_OPTIONS: SearchGroupOption[] = [
  { scope: "sn_codesearch", label: "sn_codesearch.Default Search Group" },
  { scope: "sn_devstudio", label: "sn_devstudio.Studio Search Group" },
];

export function mergeGroupOptions(fetched: SearchGroupOption[]): SearchGroupOption[] {
  return uniqBy([...fetched, ...DEFAULT_GROUP_OPTIONS], "scope");
}

export default function SearchGroupDropdown({
  groups,
  isLoading,
  value,
  onChange,
}: {
  groups: SearchGroupOption[];
  isLoading: boolean;
  value: string;
  onChange: (newValue: string) => void;
}) {
  const options = mergeGroupOptions(groups);
  const selectedLabel = options.find((o) => o.scope === value)?.label ?? value;

  return (
    <List.Dropdown tooltip={`Search Group · ${selectedLabel}`} value={value} isLoading={isLoading} onChange={onChange}>
      <List.Dropdown.Section title="Search Groups">
        {options.map((option) => (
          <List.Dropdown.Item
            key={option.scope}
            title={option.label}
            value={option.scope}
            icon={Icon.MagnifyingGlass}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
