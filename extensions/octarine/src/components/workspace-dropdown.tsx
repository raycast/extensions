import { List } from "@raycast/api";
import { ALL_WORKSPACES } from "@type/notes";

type Props = {
  sections: string[];
  value: string;
  onChange: (value: string) => void;
};

export function WorkspaceDropdown({ sections, value, onChange }: Props) {
  return (
    <List.Dropdown tooltip="Filter by workspace" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Workspaces" value={ALL_WORKSPACES} />
      {sections.map((section) => (
        <List.Dropdown.Item title={section} key={section} value={section} />
      ))}
    </List.Dropdown>
  );
}
