import { Icon, List } from "@raycast/api";
import { TypeFilter } from "../lib/query";
import { SORT_MODES, SortMode } from "../lib/types";

const TYPES = [
  { value: "all", title: "All Types", icon: Icon.BulletPoints },
  { value: "directory", title: "Directory", icon: Icon.Folder },
  { value: "file", title: "File", icon: Icon.Document },
] as const;

/** One dropdown, with independent type and sort choices. */
export function SearchOptions({
  typeFilter,
  effectiveType,
  sortMode,
  onTypeChange,
  onSortChange,
}: {
  typeFilter: TypeFilter;
  effectiveType: TypeFilter;
  sortMode: SortMode;
  onTypeChange: (type: TypeFilter) => void;
  onSortChange: (sort: SortMode) => void;
}) {
  const activeType =
    TYPES.find((type) => type.value === effectiveType) ?? TYPES[0];
  return (
    <List.Dropdown
      tooltip="Filter Type and Sort By"
      value={sortMode}
      onChange={(value) => {
        const type = TYPES.find((type) => type.value === value);
        if (type) {
          if (type.value !== typeFilter) onTypeChange(type.value);
          return;
        }
        const sort = SORT_MODES.find((mode) => mode.value === value);
        if (sort && sort.value !== sortMode) onSortChange(sort.value);
      }}
    >
      <List.Dropdown.Section
        title={`Type: ${activeType.title}${effectiveType !== typeFilter ? " (query override)" : ""}`}
      >
        {TYPES.map((type) => (
          <List.Dropdown.Item key={type.value} {...type} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort by">
        {SORT_MODES.map((mode) => (
          <List.Dropdown.Item
            key={mode.value}
            value={mode.value}
            title={
              mode.value === sortMode
                ? `${activeType.title} · ${mode.title}`
                : mode.title
            }
            icon={mode.value === sortMode ? activeType.icon : undefined}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
