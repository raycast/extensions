import { List } from "@raycast/api";
import { drupalVersions } from "./util";
import { DrupalVersionMachineCode } from "./types";
import { Dispatch, SetStateAction } from "react";

const Dropdown = ({ onVersionChange }: { onVersionChange: Dispatch<SetStateAction<DrupalVersionMachineCode>> }) => {
  return (
    <List.Dropdown
      tooltip="Select Drupal version to search in"
      storeValue={true}
      onChange={(newValue) => {
        onVersionChange(newValue as DrupalVersionMachineCode);
      }}
    >
      <List.Dropdown.Section title="Drupal versions">
        {drupalVersions.map(({ name, code }) => (
          <List.Dropdown.Item key={code} title={name} value={code} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default Dropdown;
