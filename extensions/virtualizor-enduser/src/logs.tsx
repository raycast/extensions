import { Color, Icon, List } from "@raycast/api";
import { LogsResponse } from "./lib/types";
import timestampToDate from "./lib/utils/timestamp-to-date";
import { useVirtualizor } from "./lib/hooks";

export default function Logs() {
  const { isLoading, data } = useVirtualizor<LogsResponse>("logs");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search logs">
      {data &&
        Object.entries(data.logs)
          .toReversed()
          .map(([id, log]) => (
            <List.Item
              key={id}
              icon={{ source: Icon.Dot, tintColor: log.status === "1" ? Color.Green : Color.Red }}
              title={log.action_text}
              subtitle={log.action}
              accessories={[{ tag: `VPS: ${log.vpsid}` }, { date: timestampToDate(log.time) }]}
            />
          ))}
    </List>
  );
}
