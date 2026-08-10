import { useEffect } from "react";
import { Color, Icon, List } from "@raycast/api";

import { getTableIconAndColor } from "../utils/getTableIconAndColor";

export interface TableFilterOption {
  table: string;
  label: string;
  count: number;
}

export default function CodeSearchTableFilterDropdown({
  tables,
  value,
  onChange,
  isLoading,
}: {
  tables: TableFilterOption[];
  value: string;
  onChange: (newValue: string) => void;
  isLoading: boolean;
}) {
  // Reset to "all" when the selected table is no longer present (e.g. after
  // switching search groups or running a new query that returns different tables).
  useEffect(() => {
    if (!isLoading && value !== "all" && !tables.find((t) => t.table === value)) {
      onChange("all");
    }
  }, [tables, isLoading, value]);

  return (
    <List.Dropdown
      tooltip="Filter by Table"
      value={value}
      isLoading={isLoading}
      onChange={(newValue) => {
        if (!isLoading) onChange(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All" value="all" icon={Icon.Globe} />
      <List.Dropdown.Section title="Tables">
        {tables.map((t) => {
          const { icon, color } = getTableIconAndColor(t.table);
          return (
            <List.Dropdown.Item
              key={t.table}
              title={`${t.label} (${t.count})`}
              value={t.table}
              icon={{
                source: Icon[icon as keyof typeof Icon] ?? Icon.Info,
                tintColor: Color[color as keyof typeof Color] ?? Color.SecondaryText,
              }}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
