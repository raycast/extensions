import { useEffect } from "react";
import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { uniqBy } from "lodash";

import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import { SearchResult } from "../types";

export default function TableDropdown(props: { tables: SearchResult[] | undefined; isLoading: boolean }) {
  const { tables = [], isLoading } = props;
  const [table, setTable] = useCachedState<string>("table", "all");

  useEffect(() => {
    if (!isLoading && !tables.find((t) => t.name === table)) {
      setTable("all");
    }
  }, [tables, isLoading, table]);

  return (
    <List.Dropdown
      tooltip="Select Table"
      value={table}
      isLoading={isLoading}
      onChange={(newValue) => {
        !isLoading && setTable(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All" value="all" icon={Icon.Globe} />
      <List.Dropdown.Section title="Tables">
        {uniqBy(tables, "name").map((table) => {
          const { icon, color } = getTableIconAndColor(table.name);

          return (
            <List.Dropdown.Item
              key={table.name}
              title={`${table.label_plural} (${table.record_count})`}
              value={table.name}
              icon={{
                source: Icon[icon as keyof typeof Icon],
                tintColor: Color[color as keyof typeof Color],
              }}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
