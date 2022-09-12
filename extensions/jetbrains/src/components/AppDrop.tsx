import { AppHistory, JetBrainsIcon } from "../util";
import { List } from "@raycast/api";
import React from "react";

interface AppDropProps {
  onChange: (value: ((prevState: string) => string) | string) => void;
  appHistories: AppHistory[];
}

export function AppDrop({ onChange, appHistories }: AppDropProps) {
  return (
    <List.Dropdown tooltip="Select App" onChange={onChange}>
      <List.Dropdown.Item title="All Toolbox Apps" value="" icon={JetBrainsIcon} />
      {appHistories.map((app) => (
        <List.Dropdown.Item key={app.title} title={app.title} value={app.title} icon={app.icon} />
      ))}
    </List.Dropdown>
  );
}
