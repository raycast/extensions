import { useEffect } from "react";
import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { uniqBy } from "lodash";

import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import { SearchResult } from "../types";

export default function TableDropdown(props: { results: SearchResult[] | undefined; isLoading: boolean }) {
  const { results = [], isLoading } = props;
  const [table, setTable] = useCachedState<string>("table", "all");

  useEffect(() => {
    if (!isLoading && !results.find((t) => t.name === table)) {
      setTable("all");
    }
  }, [results, isLoading, table]);

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
        {uniqBy(results, "name").map((result) => {
          const { icon, color } = getTableIconAndColor(result.name);

          return (
            <List.Dropdown.Item
              key={result.name}
              title={`${result.name == "u_documate_page" ? "Documate Pages" : result.label_plural} (${result.record_count})`}
              value={result.name}
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
