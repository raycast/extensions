import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { ArrOrObjOrNull, DNSRecord, Domain, type DomainInfo } from "./lib/types";
import { getFavicon } from "@raycast/utils";
import { NAMESILO_LINKS } from "./lib/constants";
import { parseAsArray } from "./lib/utils/parseAsArray";

export default function Domains() {
  const { isLoading, data } = useNameSilo<{ domains: Domain[] | { domain: Domain } }>("listDomains");
  const domains = data?.domains ? (data.domains instanceof Array ? data.domains : [data.domains.domain]) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {!isLoading && !domains.length ? (
        <List.EmptyView
          title="You do not have any active domains in your account"
          description="Go online to register a new domain"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Go to NameSilo Domain Search"
                url={NAMESILO_LINKS.search}
                icon={getFavicon(NAMESILO_LINKS.search)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${domains.length} domains`}>
          {domains.map((domain) => (
            <List.Item
              key={domain.domain}
              icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })}
              title={domain.domain}
              accessories={[{ text: `created: ${domain.created}` }, { text: `expires: ${domain.expires}` }]}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="Get Domain Info" target={<DomainInfo domain={domain.domain} />} />
                  <Action.Push
                    icon={Icon.Paragraph}
                    title="View DNS Records"
                    target={<DNSRecords domain={domain.domain} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function DomainInfo({ domain }: { domain: string }) {
  const { isLoading, data } = useNameSilo<DomainInfo>("getDomainInfo", {
    domain,
  });

  const markdown = !data
    ? ""
    : `
    
---
Contact IDs

| Registrant | Administrative | Technical | Billing |
|------------|----------------|-----------|---------|
| ${data.contact_ids.registrant} | ${data.contact_ids.administrative}| ${data.contact_ids.technical}| ${data.contact_ids.billing} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={`## Domains / ${domain} / Info` + markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Created" text={data.created} />
            <Detail.Metadata.Label title="Expires" text={data.expires} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={data.status}
                color={data.status === "Active" ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Locked" text={data.locked ? "✅" : "❌"} />
            <Detail.Metadata.Label title="Private" text={data.private ? "✅" : "❌"} />
            <Detail.Metadata.Label title="Auto Renew" text={data.auto_renew ? "✅" : "❌"} />
            <Detail.Metadata.Label
              title="Email Verification Required"
              text={data.email_verification_required ? "✅" : "❌"}
            />
            <Detail.Metadata.TagList title="Nameservers">
              {data.nameservers
                .sort((a, b) => a.position - b.position)
                .map((nameserver) => (
                  <Detail.Metadata.TagList.Item key={nameserver.position} text={nameserver.nameserver} />
                ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
    />
  );
}

function DNSRecords({ domain }: { domain: string }) {
  type DNSRecordsResponse = { resource_record: ArrOrObjOrNull<DNSRecord> };
  const { isLoading, data } = useNameSilo<DNSRecordsResponse>("dnsListRecords", {
    domain,
  });
  const records = parseAsArray(data?.resource_record);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search record">
      <List.Section title={`Domains / ${domain} / DNS Records`}>
        {records.map((record) => (
          <List.Item
            key={record.record_id}
            title={record.host}
            subtitle={record.record_id}
            accessories={[
              { tag: record.type },
              { text: `TTL: ${record.ttl}` },
              { text: `distance: ${record.distance}` },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
