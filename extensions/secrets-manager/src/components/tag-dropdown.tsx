import { List } from "@raycast/api";

export function TagDropdown({ tag, setTag, allTags }: { tag: string; setTag: (t: string) => void; allTags: string[] }) {
  return (
    <List.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
      <List.Dropdown.Item title="All tags" value="all" />
      {allTags.map((t) => (
        <List.Dropdown.Item key={t} title={t} value={t} />
      ))}
    </List.Dropdown>
  );
}
