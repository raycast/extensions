import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { GetLogs } from "./client/ws";
import { LogLevelT, LogT } from "./types";

const logLevels: Array<LogLevelT> = ["error", "warning", "info", "debug"];
const logLevelColors = {
  debug: Color.Green,
  info: Color.Blue,
  warning: Color.Yellow,
  error: Color.Red,
};

export default function Logs(): JSX.Element {
  const [level, setLevel] = useState<LogLevelT>("info");
  const [logsUrl, logs] = GetLogs(level);
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(logs);

  useEffect(() => {
    filterList(logsUrl ? logs.filter((item: LogT) => item.payload.includes(searchText)) : ([] as Array<LogT>));
  }, [searchText, logs.length]);

  return (
    <List enableFiltering={false} onSearchTextChange={setSearchText}>
      {logsUrl ? (
        <>
          <List.Item
            key={-1}
            title="Time"
            subtitle="Payload"
            accessoryTitle={`LogLevel(${level})`}
            actions={
              <ActionPanel>
                <Action
                  title="Swith Level"
                  onAction={() => {
                    setLevel((old) => {
                      const oldIndex = logLevels.indexOf(old);
                      return oldIndex >= logLevels.length - 1 ? logLevels[0] : logLevels[oldIndex + 1];
                    });
                  }}
                />
              </ActionPanel>
            }
          />
          {filteredList.map((log, index) => (
            <List.Item
              icon={{ source: Icon.Circle, tintColor: logLevelColors[log.type] }}
              key={index}
              title={log.time ? log.time : ""}
              subtitle={log.payload}
              accessoryTitle={log.type}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Detail" target={<Detail markdown={`\`\`\`\n${log.payload}\n\`\`\``} />} />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <></>
      )}
    </List>
  );
}
