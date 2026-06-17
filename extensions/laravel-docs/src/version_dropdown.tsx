import { List } from "@raycast/api";

export function VersionDropdown(props: { versions: string[]; id: string; onChange: (version: string) => void }) {
  return (
    <List.Dropdown tooltip="Select version" onChange={props.onChange} id={props.id} storeValue={true}>
      <List.Dropdown.Section title="Select version">
        {props.versions.map((version) => (
          <List.Dropdown.Item title={version} value={version} key={version} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
