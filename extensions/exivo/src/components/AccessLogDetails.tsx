import { List } from "@raycast/api";
import { DateTime } from "luxon";
import { useState } from "react";
import { AccessLogListItem } from "../utils/accesslogData";

type AccessLogItemProps = {
  component: string;
  logItems: AccessLogListItem[];
};

export const AccessLogDetails: React.FC<AccessLogItemProps> = ({ component, logItems }) => {
  const [searchText, setSearchText] = useState("");

  return (
    <List navigationTitle={`Door: ${component}`} onSearchTextChange={setSearchText}>
      <List.Section title="Today">
        {logItems
          .filter((x) => x.date >= DateTime.now().startOf("day"))
          .filter((x) => x.subtitle.toLowerCase().includes(searchText.toLowerCase()))
          .map((item) => (
            <List.Item key={item.id} title={item.date.toFormat("HH:mm:ss")} subtitle={item.subtitle} />
          ))}
      </List.Section>
      <List.Section title="Last 3 days">
        {logItems
          .filter((x) => x.date < DateTime.now().startOf("day"))
          .filter((x) => x.subtitle.toLowerCase().includes(searchText.toLowerCase()))
          .map((item) => (
            <List.Item key={item.id} title={item.title} subtitle={item.subtitle} />
          ))}
      </List.Section>
    </List>
  );
};
