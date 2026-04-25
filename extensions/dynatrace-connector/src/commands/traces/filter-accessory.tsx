import { List } from "@raycast/api";
import type { TenantConfig } from "../../lib/auth";

interface FilterAccessoryProps {
  tenant: TenantConfig | null;
  statusFilter: "ALL" | "OK" | "ERROR";
  durationFilter: "any" | "100ms" | "500ms" | "1s" | "5s";
  onStatusChange: (value: "ALL" | "OK" | "ERROR") => void;
  onDurationChange: (value: "any" | "100ms" | "500ms" | "1s" | "5s") => void;
}

export function FilterAccessory({
  tenant,
  statusFilter,
  durationFilter,
  onStatusChange,
  onDurationChange,
}: FilterAccessoryProps) {
  // For simplicity, just show the filters dropdown
  // TenantSwitcher can be added separately if needed
  if (!tenant) return null;

  return (
    <List.Dropdown
      tooltip="Filter by status and duration"
      value={`${statusFilter}:${durationFilter}`}
      onChange={(value) => {
        const [status, duration] = value.split(":");
        onStatusChange(status as "ALL" | "OK" | "ERROR");
        onDurationChange(duration as "any" | "100ms" | "500ms" | "1s" | "5s");
      }}
    >
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="All Statuses" value={`ALL:${durationFilter}`} />
        <List.Dropdown.Item title="OK" value={`OK:${durationFilter}`} />
        <List.Dropdown.Item title="Error" value={`ERROR:${durationFilter}`} />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Duration">
        <List.Dropdown.Item title="Any Duration" value={`${statusFilter}:any`} />
        <List.Dropdown.Item title=">100ms" value={`${statusFilter}:100ms`} />
        <List.Dropdown.Item title=">500ms" value={`${statusFilter}:500ms`} />
        <List.Dropdown.Item title=">1 second" value={`${statusFilter}:1s`} />
        <List.Dropdown.Item title=">5 seconds" value={`${statusFilter}:5s`} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
