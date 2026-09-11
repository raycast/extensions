import { Color, List } from "@raycast/api";
import { APPLICATION_SORT_MODES, ApplicationSortMode, isApplicationSortMode } from "./application-sort";
import { AppFreezerApplication } from "./protocol";

export type { ApplicationSortMode } from "./application-sort";

const SORT_MODE_TITLES: Record<ApplicationSortMode, string> = {
  name: "Name",
  cpu: "CPU",
  memory: "Memory",
};

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
      onChange={(newValue) => {
        if (isApplicationSortMode(newValue)) {
          onChange(newValue);
        }
      }}
    >
      {APPLICATION_SORT_MODES.map((mode) => (
        <List.Dropdown.Item key={mode} title={SORT_MODE_TITLES[mode]} value={mode} />
      ))}
    </List.Dropdown>
  );
}
