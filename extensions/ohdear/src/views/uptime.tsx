import { List } from "@raycast/api";
import { getUptime } from "../api";
import { EmptyView } from "../components/empty-view";
import { Site } from "../interface";
import dayjs from "dayjs";

export default function UptimeCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getUptime(item);

  return (
    <List navigationTitle={`Uptime for ${item.label}`} isLoading={isLoading}>
      <EmptyView title={Array.isArray(data) && data?.length ? "No Results Found" : "No Uptime Logs Available"} />
      <List.Section title="Showing Last 30 Days">
        {Array.isArray(data) &&
          data?.map((item: any, index: number) => {
            const checkDate = dayjs.utc(item.datetime).local().format("YYYY-MM-DD HH:mm:ss");
            return <List.Item key={index} title={`${item.uptime_percentage}% Uptime`} subtitle={checkDate} />;
          })}
      </List.Section>
    </List>
  );
}
