import { ActionPanel, List, Action } from "@raycast/api";
import { useMemo, useState } from "react";

type DocumentationItem = {
  title: string;
  url: string;
};

type Documentation = Record<string, DocumentationItem[]>;

type DropdownOption = {
  title: string;
  value: string;
};

import v4Documentation from "./documentation/v4-tailwind-css";
import v3Documentation from "./documentation/v3-tailwind-css";
import v2Documentation from "./documentation/v2-tailwind-css";
import v1Documentation from "./documentation/v1-tailwind-css";
import v0Documentation from "./documentation/v0-tailwind-css";

const documentationMap: Record<string, Documentation> = {
  v4: v4Documentation,
  v3: v3Documentation,
  v2: v2Documentation,
  v1: v1Documentation,
  v0: v0Documentation,
};

const dropdownOptions: DropdownOption[] = [
  { title: "Latest - V4", value: "v4" },
  { title: "V3", value: "v3" },
  { title: "V2", value: "v2" },
  { title: "V1", value: "v1" },
  { title: "V0", value: "v0" },
];

export default function SearchDocumentation() {
  const [selectedVersion, setSelectedVersion] = useState<string>(dropdownOptions[0].value);

  const documentation = useMemo<Documentation>(() => {
    return documentationMap[selectedVersion] || v4Documentation;
  }, [selectedVersion]);

  return (
    <List
      searchBarPlaceholder="Search Tailwind CSS Documentation..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Tailwind CSS Version"
          storeValue
          onChange={setSelectedVersion}
          defaultValue={selectedVersion}
        >
          {dropdownOptions.map((option: DropdownOption) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item: DocumentationItem) => (
            <List.Item
              key={item.url}
              icon="tailwind-icon.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
