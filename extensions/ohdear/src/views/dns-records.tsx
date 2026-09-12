import { Action, ActionPanel, List } from "@raycast/api";
import { getDNSRecords } from "../api";
import { EmptyView } from "../components/empty-view";
import { DNSRecord, Site } from "../interface";
import { camelCaseToWords } from "../utils/camel-case";
import { ohdearUrl } from "../utils/constants";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(relativeTime);
dayjs.extend(utc);

export default function DNSRecordsCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getDNSRecords(item);

  return (
    <List navigationTitle={`DNS Records for ${item.label}`} isLoading={isLoading} isShowingDetail>
      <EmptyView title={data?.length ? "No Results Found" : "No DNS Records Available"} />
      {data?.map((record: DNSRecord, index: number) => {
        const lastCheck = dayjs.utc(record.created_at).local().fromNow();

        return (
          <List.Item
            key={index}
            title={`Discovered ${lastCheck}`}
            keywords={[record.id.toString()]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Changes" text={`${record.diff_summary}`} />
                    <List.Item.Detail.Metadata.Separator />
                    {record.authoritative_nameservers.map((nameserver: string, index: number) => (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={`Nameserver ${index + 1}`}
                        text={nameserver}
                      />
                    ))}
                    <List.Item.Detail.Metadata.Separator />
                    {record.dns_records.map((dnsRecords: any) => {
                      return Object.keys(dnsRecords).map((key: string) => (
                        <List.Item.Detail.Metadata.Label
                          key={key}
                          title={camelCaseToWords(key)}
                          text={`${dnsRecords[key]}`}
                        />
                      ));
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Oh Dear"
                  url={`${ohdearUrl}/sites/${item.id}/check/dns/history/${record.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
