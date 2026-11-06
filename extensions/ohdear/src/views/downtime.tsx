import { List } from "@raycast/api";
import { getDowntime } from "../api";
import { EmptyView } from "../components/empty-view";
import { Downtime, Site } from "../interface";

export default function DowntimeCommand({ item }: { item: Site }) {
  const { data, isLoading } = getDowntime(item);

  return (
    <List navigationTitle={`Downtime for ${item.label}`} isLoading={isLoading}>
      <EmptyView title={Array.isArray(data) && data?.length ? "No Results Found" : "No Downtime Logs Available"} />
      <List.Section title="Showing Last 30 Days">
        {Array.isArray(data) &&
          data?.map((item: Downtime, index: number) => (
            <List.Item key={index} title={`${item.started_at} - ${item.ended_at}`} />
          ))}
      </List.Section>
    </List>
  );
}
