import { LogStartTimes } from "../../interfaces";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";

function CloudwatchLogsTimeDropdown({ onChange }: { onChange(logStartTime: LogStartTimes): void }) {
  const [logStartTime, setLogStartTime] = useState<LogStartTimes>(LogStartTimes.OneHour);

  useEffect(() => {
    onChange(logStartTime);
  }, [logStartTime]);

  return (
    <List.Dropdown
      tooltip="Select Log Start"
      placeholder={"Log Start Time"}
      value={logStartTime}
      onChange={(val) => setLogStartTime(val as LogStartTimes)}
    >
      {Object.values(LogStartTimes).map((logStartTime) => (
        <List.Dropdown.Item key={logStartTime} value={logStartTime} title={logStartTime} />
      ))}
    </List.Dropdown>
  );
}

export default CloudwatchLogsTimeDropdown;
