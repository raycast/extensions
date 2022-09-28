import { Color, Icon, getPreferenceValues, ActionPanel, List } from "@raycast/api";
import { QueryLogs, QueryLog, QueryBlockStatus } from "./interfaces";
import { useEffect, useState } from "react";
import { UNIXTimestampToTime, AddToListAction, cleanPiholeURL, fetchRequestTimeout } from "./utils";
import { v4 as uuidv4 } from "uuid";

export default function () {
  const { PIHOLE_URL, API_TOKEN } = getPreferenceValues();
  const [timeoutInfo, updateTimeoutInfo] = useState<string>();
  const [queryLogs, updateQueryLogs] = useState<QueryLog[]>();
  useEffect(() => {
    async function getQueryLogs() {
      const response = await fetchRequestTimeout(
        `http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?getAllQueries=3600&auth=${API_TOKEN}`
      );
      if (response == "query-aborted" || response == undefined) {
        updateTimeoutInfo("query-aborted");
      } else {
        updateTimeoutInfo("no-timeout");
        let { data } = (await response!.json()) as QueryLogs;
        data = data.reverse();
        const queryLogsArray: QueryLog[] = [];
        for (let i = 0; i < data.length; i++) {
          queryLogsArray.push({
            timestamp: UNIXTimestampToTime(parseInt(data[i][0])),
            domain: data[i][2],
            client: data[i][3],
            blockStatus:
              data[i][4] == "1"
                ? QueryBlockStatus.Blocked
                : data[i][4] == "3"
                ? QueryBlockStatus.Cached
                : data[i][4] == "4"
                ? QueryBlockStatus.Blocked
                : data[i][4] == "5"
                ? QueryBlockStatus.Blocked
                : QueryBlockStatus.NotBlocked,
          } as QueryLog);
        }
        updateQueryLogs(queryLogsArray);
      }
    }
    getQueryLogs();
  }, []);

  return timeoutInfo === "query-aborted" ? (
    <List>
      <List.Item
        key={"validation error"}
        title={`Invalid Pi-Hole URL or API token has been provided`}
        accessories={[{ text: "Please check extensions -> Pie for Pi-hole " }]}
      />
    </List>
  ) : (
    <List
      isLoading={queryLogs == undefined ? true : false}
      navigationTitle="Top Queries"
      searchBarPlaceholder="Search for domains"
    >
      {queryLogs?.map((item) => (
        <List.Item
          key={uuidv4().toString()}
          title={item.domain}
          icon={
            item.blockStatus == QueryBlockStatus.Blocked
              ? { source: Icon.XmarkCircle, tintColor: Color.Red }
              : item.blockStatus == QueryBlockStatus.Cached
              ? { source: Icon.MemoryChip, tintColor: Color.Blue }
              : { source: Icon.Checkmark, tintColor: Color.Green }
          }
          subtitle={`${item.client} ${
            item.blockStatus == QueryBlockStatus.Blocked
              ? "(Blocked)"
              : item.blockStatus == QueryBlockStatus.Cached
              ? "(Local cache)"
              : ""
          }`}
          accessories={[{ text: item.timestamp }]}
          actions={
            <ActionPanel title="Actions">
              <AddToListAction
                domain={item.domain}
                listType={item.blockStatus == QueryBlockStatus.Blocked ? "white" : "black"}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
