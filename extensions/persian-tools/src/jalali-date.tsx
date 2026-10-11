import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { buildDateRows } from "./lib/jalali";

export default function Command(props?: LaunchProps) {
  const [searchText, setSearchText] = useState(props?.fallbackText ?? "");
  const rows = useMemo(() => buildDateRows(searchText, new Date()), [searchText]);

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="1403/5/12, 2024-08-02, ۱۲ مرداد, +10d"
    >
      {rows.map((row, index) => (
        <List.Item
          key={`${row.title}-${index}`}
          title={row.title}
          subtitle={row.subtitle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={row.copy} />
              <Action.Paste content={row.copy} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
