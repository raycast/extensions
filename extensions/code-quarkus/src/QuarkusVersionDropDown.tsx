import { List } from "@raycast/api";
import React from "react";
import { QuarkusVersion } from "./models/QuarkusVersion";

export function QuarkusVersionDropdown(props: {
  quarkusVersions: QuarkusVersion[];
  onQuarkusVersionChange: (newValue: QuarkusVersion) => void;
}) {
  const { quarkusVersions, onQuarkusVersionChange } = props;

  function onVersionChange(key: string) {
    const version = quarkusVersions.filter((v) => v.key === key)[0];
    onQuarkusVersionChange(version);
  }

  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        onVersionChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {quarkusVersions.map((v) => (
          <List.Dropdown.Item key={v.key} value={v.key} title={v?.platformVersion + (v?.lts ? " [LTS]" : "")} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
