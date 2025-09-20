import { AppHistory, JetBrainsIcon } from "../util";
import { Icon, List } from "@raycast/api";
import React from "react";

interface AppDropProps {
  filter: string;
  onChange: (value: string) => void;
  appHistories: AppHistory[];
}

export function AppDrop({ onChange, appHistories, filter }: AppDropProps) {
  return (
    <List.Dropdown tooltip="Select App" onChange={onChange} value={filter}>
      <List.Dropdown.Item title="Everything" value="" icon={Icon.PlusCircleFilled} />
      <List.Dropdown.Item title="Recent & Favourites" value="recent" icon={Icon.List} />
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All Apps" value="all" icon={JetBrainsIcon} />
        {appHistories.map((app) => (
          <List.Dropdown.Item key={app.name} title={app.name} value={app.name} icon={app.icon} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
