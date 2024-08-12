import { useState } from "react";
import data from "@hello-nav/model";
import { ActionPanel, Action, List } from "@raycast/api";
import { AppItem } from "./types";

const appList = data.reduce<AppItem[]>((res, item) => [...res, ...item.children], []);
type LinkKey = "homepage" | "repository";
type LinkType = { value: LinkKey; name: string };
const types: LinkType[] = [
  { value: "homepage", name: "Homepage" },
  { value: "repository", name: "GitHub" },
];

function Dropdown(props: { types: LinkType[]; onTypeChange: (value: LinkKey) => void }) {
  return (
    <List.Dropdown tooltip="Select Open Link" storeValue={true} onChange={(t) => props.onTypeChange(t as LinkKey)}>
      <List.Dropdown.Section>
        {props.types.map((item) => (
          <List.Dropdown.Item key={item.value} title={item.name} value={item.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [type, setType] = useState<"homepage" | "repository">("homepage");
  return (
    <List
      navigationTitle="Hello Nav"
      searchBarPlaceholder="Search App"
      searchBarAccessory={<Dropdown types={types} onTypeChange={setType} />}
    >
      {appList.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          subtitle={item[type] || "None repository info"}
          icon={{ source: "https://esm.sh/@hello-nav/model/dist/" + item.icon }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item[type] || item.homepage} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
