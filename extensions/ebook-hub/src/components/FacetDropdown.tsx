import { List } from "@raycast/api";

import { ALL_FILTER, encodeFilter, type Facets } from "../domain/filters";
import { languageLabel } from "../domain/languages";

interface FacetDropdownProps {
  facets: Facets;
  /** Controlled: the command owns the filter so it can be cleared from an empty view. */
  value: string;
  onChange: (value: string) => void;
  includeVisibility?: boolean;
}

function titleCase(value: string): string {
  return value.replace(
    /(^|[-\s])(\p{L})/gu,
    (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`,
  );
}

export function FacetDropdown({ facets, value, onChange, includeVisibility = false }: FacetDropdownProps) {
  return (
    <List.Dropdown tooltip="Filter Books" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Books" value={ALL_FILTER} />
      {facets.languages.length > 0 ? (
        <List.Dropdown.Section title="Language">
          {facets.languages.map((code) => (
            <List.Dropdown.Item
              key={code}
              title={languageLabel(code)}
              value={encodeFilter({ kind: "language", code })}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      {facets.categories.length > 0 ? (
        <List.Dropdown.Section title="Category">
          {facets.categories.map((name) => (
            <List.Dropdown.Item key={name} title={titleCase(name)} value={encodeFilter({ kind: "category", name })} />
          ))}
        </List.Dropdown.Section>
      ) : null}
      {includeVisibility ? (
        <List.Dropdown.Section title="Visibility">
          <List.Dropdown.Item title="Private" value={encodeFilter({ kind: "visibility", visibility: "private" })} />
          <List.Dropdown.Item title="Shared" value={encodeFilter({ kind: "visibility", visibility: "shared" })} />
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}
