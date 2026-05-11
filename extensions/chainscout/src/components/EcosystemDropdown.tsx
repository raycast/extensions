import { List } from "@raycast/api";
import React from "react";

interface Props {
  ecosystems: Array<string>;
  onEcosystemChange: (ecosystem: string) => void;
}

const EcosystemDropdown = ({ ecosystems, onEcosystemChange }: Props) => {
  return (
    <List.Dropdown
      tooltip="Filter by Ecosystem"
      storeValue={true}
      onChange={(newValue) => {
        onEcosystemChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Blockchain Ecosystems">
        {ecosystems.map((ecosystem) => (
          <List.Dropdown.Item key={ecosystem} title={ecosystem} value={ecosystem} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default EcosystemDropdown;
