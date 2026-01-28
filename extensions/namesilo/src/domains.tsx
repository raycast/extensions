import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { Domain, type DomainInfo } from "./lib/types";
import { getFavicon } from "@raycast/utils";
import { NAMESILO_LINKS } from "./lib/constants";
import NameServers from "./lib/components/name-servers";
import DNSRecords from "./lib/components/dns-records";
import EmailForwards from "./lib/components/email-forwards";

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
                  <Action.Push
                    icon={Icon.List}
                    title="View NameServers"
                    target={<NameServers domain={domain.domain} />}
                  />
                  <Action.Push
                    icon={Icon.Envelope}
                    title="View Email Forwards"
                    target={<EmailForwards domain={domain.domain} />}
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
