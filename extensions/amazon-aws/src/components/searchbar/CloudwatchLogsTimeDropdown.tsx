import { LogStartTimes } from "../../interfaces";
import { List } from "@raycast/api";

function CloudwatchLogsTimeDropdown({
  logStartTime,
  onChange,
}: {
  logStartTime: LogStartTimes;
  onChange(logStartTime: LogStartTimes): void;
}) {
  return (
    <List.Dropdown
      tooltip="Select Log Start"
      placeholder={"Log Start Time"}
      value={logStartTime}
      onChange={(val) => onChange(val as LogStartTimes)}
    >
      {Object.values(LogStartTimes).map((logStartTime) => (
        <List.Dropdown.Item key={logStartTime} value={logStartTime} title={logStartTime} />
      ))}
    </List.Dropdown>
  );
}

export default CloudwatchLogsTimeDropdown;
