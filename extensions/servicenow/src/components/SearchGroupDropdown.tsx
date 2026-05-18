import { Icon, List } from "@raycast/api";
import { uniqBy } from "lodash";

import { SearchGroupOption } from "../hooks/useSearchGroups";

export const DEFAULT_SEARCH_GROUP_SCOPE = "sn_codesearch";

export const DEFAULT_GROUP_OPTIONS: SearchGroupOption[] = [
  { sysId: "", scope: "sn_codesearch", label: "sn_codesearch.Default Search Group" },
  { sysId: "", scope: "sn_devstudio", label: "sn_devstudio.Studio Search Group" },
];

// Tables searched when no sn_codesearch_table rows are available for the selected
// search group (e.g. on instances without the Code Search plugin installed, or for
// the placeholder default options). Mirrors the OOB sn_codesearch Default Search
// Group; see https://github.com/arnoudkooi/ServiceNow-Utils/blob/master/codesearch.js
export const FALLBACK_CODE_SEARCH_TABLES: string[] = [
  "sys_script_include",
  "sys_script",
  "sys_script_client",
  "sys_ui_action",
  "sys_ui_policy",
  "sysauto_script",
  "sys_processor",
  "sysrule_escalate",
  "sys_transform_script",
  "sys_script_validator",
  "sysevent_script_action",
  "sys_web_service",
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
