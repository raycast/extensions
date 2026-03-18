import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { timestampToReadableTime } from "./utils";

interface Log {
  time: string;
  message: string;
  level: string;
  id?: string; // Optional ID for better keying in the list
}

interface SyncthingLogApi {
  when: string;
  message: string;
  level: string;
}

interface SyncthingLogResponse {
  messages?: SyncthingLogApi[];
}

async function getRecentLogs(
  API_KEY: string,
  BASE_URL: string,
): Promise<Log[] | void> {
  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/log", { headers });
    const data = (await res.json()) as SyncthingLogResponse;
    const logs = [...(data.messages || [])];
    console.log("Logs data [0:3]: ", logs.slice(0, 3));

    if (logs.length === 0) {
      console.log("No recent logs found.");
      return [];
    }

    // sort logs by time, newest first
    logs.sort(
      (a: SyncthingLogApi, b: SyncthingLogApi) =>
        new Date(b.when).getTime() - new Date(a.when).getTime(),
    );

    return logs.map((log) => ({
      time: log.when,
      message: log.message,
      level: log.level,
      id: crypto.randomUUID(), // Multiple similar messages can exist @ same timestamp
    }));
  } catch (error) {
    console.error("Error fetching recent logs:", error);
    return [];
  }
}

function LogDetail(log: Log) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={timestampToReadableTime(log.time)}
      markdown={log.message}
      actions={
        <ActionPanel>
          <Action title="Close" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const { push } = useNavigation();
  useEffect(() => {
    const API_KEY = getPreferenceValues().api_key;
    const BASE_URL = getPreferenceValues().base_url;
    getRecentLogs(API_KEY, BASE_URL).then((fetchedLogs) => {
      if (fetchedLogs) {
        setLogs(fetchedLogs);
      }
    });
  }, []);
  return (
    <List
      filtering
      searchBarAccessory={
        <>
          <List.Dropdown
            tooltip="Filter by log level"
            storeValue
            onChange={setLevelFilter}
          >
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Error" value="ERR" />
            <List.Dropdown.Item title="Warning" value="WRN" />
            <List.Dropdown.Item title="Info" value="INF" />
          </List.Dropdown>
        </>
      }
    >
      {logs
        .filter((log) => levelFilter === "all" || log.level === levelFilter)
        .map((log) => (
          <List.Item
            key={log.id}
            title={log.message}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => push(<LogDetail {...log} />)}
                />
                <Action.CopyToClipboard
                  title="Copy Log Message"
                  content={log.message}
                />
              </ActionPanel>
            }
            accessories={[
              { date: new Date(log.time) },
              {
                tag: {
                  value: log.level.toUpperCase(),
                  color:
                    log.level === "ERR"
                      ? Color.Red
                      : log.level === "WRN"
                        ? Color.Yellow
                        : Color.Blue,
                },
              },
            ]}
          />
        ))}
    </List>
  );
}
