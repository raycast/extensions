import { List } from "@raycast/api";
import { FC } from "react";

const sortItems = {
  name: "Name",
  pid: "PID",
  cpu: "CPU",
  memRss: "Memory",
};
export type SortKey = keyof typeof sortItems;

export const SortDropdown: FC<{
  sort: SortKey;
  onChange(key: string): void;
}> = ({ onChange, sort }) => {
  return (
    <List.Dropdown value={sort} tooltip="Sort by..." onChange={onChange}>
      {Object.entries(sortItems).map(([key, title]) => (
        <List.Dropdown.Item key={key} value={key} title={title} />
      ))}
    </List.Dropdown>
  );
};
