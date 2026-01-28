import { List } from "@raycast/api";

export function VersionDropdown(props: {
  vueVersions: string[];
  id: string;
  onVersionChange: (version: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Select version" onChange={props.onVersionChange} id={props.id} storeValue={true}>
      <List.Dropdown.Section title="Select version">
        {props.vueVersions.map((version, index) => (
          <List.Dropdown.Item title={version} value={version} key={index} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
