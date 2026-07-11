import { List } from "@raycast/api";
import { SelectedVersion, Version } from "../models/gradle-plugin";
import { getConfig } from "../config";

export function VersionDropdown(props: {
  selectedVersion: SelectedVersion;
  versions: Version[];
  onVersionChange: (newValue: string) => void;
}) {
  const { versions, onVersionChange } = props;
  const { gradleURL } = getConfig();

  return (
    <List.Dropdown
      tooltip="Select the Version"
      storeValue={true}
      onChange={(newValue) => {
        if (newValue !== "-") {
          onVersionChange(newValue);
        }
      }}
    >
      <List.Dropdown.Item key={props.selectedVersion.name} title={props.selectedVersion.name} value="-" />
      <List.Dropdown.Section title="Other Versions">
        {versions.map((pluginVersion) => (
          <List.Dropdown.Item
            key={pluginVersion.version}
            title={pluginVersion.version}
            value={gradleURL + pluginVersion.link}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
