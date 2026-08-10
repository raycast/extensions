import { List } from "@raycast/api";
import { getPerformanceRecords } from "../api";
import { EmptyView } from "../components/empty-view";
import { PerformanceRecord, Site } from "../interface";

export default function PerformanceRecordsCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getPerformanceRecords(item);

  return (
    <List navigationTitle={`Performance Records for ${item.label}`} isLoading={isLoading} isShowingDetail>
      <EmptyView title={data?.length ? "No Results Found" : "No Performance Records Available"} />
      {data?.map((record: PerformanceRecord, index: number) => (
        <List.Item
          key={index}
          title={`Performance Record #${index + 1}`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="DNS Time in Seconds" text={`${record.dns_time_in_seconds}`} />
                  <List.Item.Detail.Metadata.Label title="TCP Time in Seconds" text={`${record.tcp_time_in_seconds}`} />
                  <List.Item.Detail.Metadata.Label
                    title="SSH Handshake Time in Seconds"
                    text={`${record.ssl_handshake_time_in_seconds}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Remote Server Processing Time in Seconds"
                    text={`${record.remote_server_processing_time_in_seconds}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Download Time in seconds"
                    text={`${record.download_time_in_seconds}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Total Time in Seconds"
                    text={`${record.total_time_in_seconds}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Created at" text={`${record.created_at}`} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="cURL" />

                  <List.Item.Detail.Metadata.Label title="Name Lookup Time" text={`${record.curl.namelookup_time}`} />
                  <List.Item.Detail.Metadata.Label title="Connect Time" text={`${record.curl.connect_time}`} />
                  <List.Item.Detail.Metadata.Label title="App Connect Time" text={`${record.curl.appconnect_time}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Start Transfer Time"
                    text={`${record.curl.starttransfer_time}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Pre Transfer Time" text={`${record.curl.pretransfer_time}`} />
                  <List.Item.Detail.Metadata.Label title="Redirect Time" text={`${record.curl.redirect_time}`} />
                  <List.Item.Detail.Metadata.Label title="Total Time" text={`${record.curl.total_time}`} />
                  <List.Item.Detail.Metadata.Label title="Header Size" text={`${record.curl.header_size}`} />
                  <List.Item.Detail.Metadata.Label title="Size Download" text={`${record.curl.size_download}`} />
                  <List.Item.Detail.Metadata.Label title="Speed Download" text={`${record.curl.speed_download}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
