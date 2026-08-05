import { Color, List } from "@raycast/api";
import { ApplicationSortMode } from "./application-sort";
import { AppFreezerApplication } from "./protocol";

export type { ApplicationSortMode } from "./application-sort";

function formatPercent(value: number): string {
  return value.toFixed(value >= 10 ? 0 : 1);
}

export function applicationAccessories(application: AppFreezerApplication): List.Item.Accessory[] {
  return [
    ...(application.status === "paused"
      ? [{ tag: { value: "Paused", color: Color.Blue }, tooltip: "Paused by App Freezer" } as List.Item.Accessory]
      : []),
    {
      text: `${formatPercent(application.cpuPercent)}% CPU`,
      tooltip: "Current whole-machine CPU share",
    },
    {
      text: `${formatPercent(application.memoryPercent)}% Memory`,
      tooltip: "Current physical memory footprint",
    },
  ];
}

export function ApplicationSortDropdown({
  value,
  onChange,
}: {
  value: ApplicationSortMode;
  onChange: (value: ApplicationSortMode) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Sort Applications"
      value={value}
      onChange={(newValue) => onChange(newValue as ApplicationSortMode)}
    >
      <List.Dropdown.Item title="Name" value="name" />
      <List.Dropdown.Item title="CPU" value="cpu" />
      <List.Dropdown.Item title="Memory" value="memory" />
    </List.Dropdown>
  );
}
