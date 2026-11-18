import { Color, Icon, List } from "@raycast/api";
import type { ApiSource, ApiView } from "pond-api";
import { kindName, sourceName } from "../lib/display";
import { ALL_SAVES, decodeFilter, encodeFilter, type Filter } from "../lib/filters";
import type { Lookups } from "../lib/library";

/** The dropdown lists the most used tags; the rest stay one Filter action away. */
const TAG_LIMIT = 40;

export function filterTitle(filter: Filter, lookups: Pick<Lookups, "folderById">, views?: readonly ApiView[]): string {
  switch (filter.kind) {
    case "all":
      return "All Saves";
    case "trash":
      return "Trash";
    case "untagged":
      return "Untagged";
    case "unfiled":
      return "Not in a Folder";
    case "source":
      return sourceName(filter.source);
    case "folder":
      return lookups.folderById.get(filter.id)?.path ?? "Folder";
    case "tag":
      return `#${filter.name}`;
    case "view":
      return views?.find((view) => view.id === filter.id)?.name ?? "Saved View";
    case "media":
      return filter.types.map((type) => kindName(type) ?? type).join(" and ");
  }
}

export interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  lookups: Lookups;
  views: readonly ApiView[];
  sources: readonly ApiSource[];
}

export function FilterDropdown({ value, onChange, lookups, views, sources }: FilterDropdownProps) {
  const tags = [...lookups.tags]
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.count - a.count)
    .slice(0, TAG_LIMIT);
  const current = decodeFilter(value);
  const listed =
    current.kind === "all" ||
    current.kind === "trash" ||
    current.kind === "untagged" ||
    current.kind === "unfiled" ||
    (current.kind === "view" && views.some((view) => view.id === current.id)) ||
    (current.kind === "source" && sources.some((source) => source.source === current.source)) ||
    (current.kind === "folder" && lookups.folderById.has(current.id)) ||
    (current.kind === "tag" && tags.some((tag) => tag.name === current.name));

  return (
    <List.Dropdown tooltip="Filter Saves" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Saves" value={encodeFilter(ALL_SAVES)} icon={Icon.Tray} />
      {!listed && <List.Dropdown.Item title={filterTitle(current, lookups, views)} value={value} icon={Icon.Filter} />}
      <List.Dropdown.Section title="Library">
        <List.Dropdown.Item title="Untagged" value={encodeFilter({ kind: "untagged" })} icon={Icon.Tag} />
        <List.Dropdown.Item title="Not in a Folder" value={encodeFilter({ kind: "unfiled" })} icon={Icon.Folder} />
        <List.Dropdown.Item title="Trash" value={encodeFilter({ kind: "trash" })} icon={Icon.Trash} />
      </List.Dropdown.Section>
      {views.length > 0 && (
        <List.Dropdown.Section title="Saved Views">
          {views.map((view) => (
            <List.Dropdown.Item
              key={view.id}
              title={view.name}
              value={encodeFilter({ kind: "view", id: view.id })}
              icon={Icon.Eye}
            />
          ))}
        </List.Dropdown.Section>
      )}
      {sources.length > 0 && (
        <List.Dropdown.Section title="Sources">
          {[...sources]
            .sort((a, b) => b.count - a.count)
            .map((source) => (
              <List.Dropdown.Item
                key={source.source}
                title={sourceName(source.source)}
                value={encodeFilter({ kind: "source", source: source.source })}
                icon={Icon.Globe}
              />
            ))}
        </List.Dropdown.Section>
      )}
      {lookups.folders.length > 0 && (
        <List.Dropdown.Section title="Folders">
          {lookups.folders.map((folder) => (
            <List.Dropdown.Item
              key={folder.id}
              title={folder.path}
              value={encodeFilter({ kind: "folder", id: folder.id })}
              icon={{ source: Icon.Folder, tintColor: folder.color ?? Color.SecondaryText }}
            />
          ))}
        </List.Dropdown.Section>
      )}
      {tags.length > 0 && (
        <List.Dropdown.Section title="Tags">
          {tags.map((tag) => (
            <List.Dropdown.Item
              key={tag.name}
              title={tag.name}
              value={encodeFilter({ kind: "tag", name: tag.name })}
              icon={tag.starred ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Tag}
            />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
