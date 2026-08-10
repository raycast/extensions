import { type Domain, DomainRecord, useDomainRecords, useDomains } from "./client";
import { ActionPanel, Action, Detail, List, Icon } from "@raycast/api";
import { useMemo } from "react";
import DomainRecordDetail from "./details/DomainRecordDetail";
import DomainRecordForm from "./forms/DomainRecordForm";
import { getFavicon } from "@raycast/utils";
import { DO } from "./config";

export default function Command() {
  const { data, error, isLoading } = useDomains();
  const domains = data?.domains || [];

  if (error) {
    return <Detail markdown={`Failed to list domains: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !domains.length && (
        <List.EmptyView
          icon={DO.LOGO}
          title="Resilient network"
          description="Add your first domain now"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={DO.ICON} title="Add Domain" url={DO.LINKS.networking.domains} />
            </ActionPanel>
          }
        />
      )}
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
          title={domain.name}
          actions={
            <ActionPanel>
              <Action.Push title="View Records" icon={Icon.Eye} target={<DomainRecords domain={domain} />} />
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/networking/domains/${domain.name}`} />
              <Action.Push
                icon={Icon.Plus}
                title="Create A Record"
                target={<DomainRecordForm domain={domain.name} type="A" />}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create CNAME Record"
                target={<DomainRecordForm domain={domain.name} type="CNAME" />}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create MX Record"
                target={<DomainRecordForm domain={domain.name} type="MX" />}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create TXT Record"
                target={<DomainRecordForm domain={domain.name} type="TXT" />}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create SRV Record"
                target={<DomainRecordForm domain={domain.name} type="SRV" />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DomainRecords({ domain }: { domain: Domain }) {
  const { data, error, isLoading } = useDomainRecords(domain.name);

  if (error) {
    return <Detail markdown={`Failed to list records for domain ${domain.name}: ${error.message}`} />;
  }

  const records = useMemo(
    () =>
      data?.domain_records.reduce(
        (buckets, record) => {
          if (!buckets[record.type]) {
            buckets[record.type] = [record];
          } else {
            buckets[record.type].push(record);
          }
          return buckets;
        },
        {} as Record<string, DomainRecord[]>,
      ),
    [data],
  );

  return (
    <List isLoading={isLoading}>
      {!records
        ? null
        : Object.keys(records)
            .sort()
            .map((type) => (
              <List.Section key={type} title={`Type ${type}`}>
                {records[type].map((record) => (
                  <List.Item
                    key={record.id}
                    title={record.name === "@" ? domain.name : `${record.name}.${domain.name}`}
                    subtitle={record.data}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Details"
                          icon={Icon.Eye}
                          target={<DomainRecordDetail domain={domain} record={record} />}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            ))}
    </List>
  );
}
