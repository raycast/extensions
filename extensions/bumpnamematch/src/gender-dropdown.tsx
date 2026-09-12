import { List } from "@raycast/api";

/** Gender filter values match the /api/names `gender` query param (m/f/n). */
export type GenderFilter = "" | "m" | "f" | "n";

/** Search-bar dropdown to filter names by gender (All / Boy / Girl / Neutral). */
export function GenderDropdown({ value, onChange }: { value: GenderFilter; onChange: (value: GenderFilter) => void }) {
  return (
    <List.Dropdown tooltip="Filter by gender" value={value} onChange={(v) => onChange(v as GenderFilter)}>
      <List.Dropdown.Item title="All Genders" value="" />
      <List.Dropdown.Item title="Boy" value="m" />
      <List.Dropdown.Item title="Girl" value="f" />
      <List.Dropdown.Item title="Neutral" value="n" />
    </List.Dropdown>
  );
}
