import * as React from "react";
import { Fragment } from "react";
import * as dns from "node:dns/promises";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function DnsInfo({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "dns-info", enabled, url, fetcher: getDnsInfo });

  return (
    <List.Item
      title="DNS Records"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="A" text={data.A?.address} />

                {/* AAA */}
                {data.AAA && data.AAA.length > 0 && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Separator />
                    {data.AAA.map((rec) => (
                      <List.Item.Detail.Metadata.Label key={rec} title="AAA" text={rec} />
                    ))}
                  </Fragment>
                )}

                {/* CNAME */}
                {data.CNAME && data.CNAME.length > 0 && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Separator />
                    {data.CNAME.map((rec) => (
                      <List.Item.Detail.Metadata.Label key={rec} title="CNAME" text={rec} />
                    ))}
                  </Fragment>
                )}

                {/* NS */}
                {data.NS && data.NS.length > 0 && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Separator />
                    {data.NS.map(([rec]) => (
                      <List.Item.Detail.Metadata.Label key={rec} title="NS" text={rec} />
                    ))}
                  </Fragment>
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getDnsInfo(url: string) {
  const hostname = new URL(url).hostname;

  const [A, AAA, MX, TXT, NS, CNAME, SOA, SRV, PTR] = await Promise.all([
    safe(dns.lookup(hostname)),
    safe(dns.resolve4(hostname)),
    safe(dns.resolve6(hostname)),
    safe(dns.resolveMx(hostname)),
    safe(dns.resolveTxt(hostname)),
    safe(dns.resolveCname(hostname)),
    safe(dns.resolveSoa(hostname)),
    safe(dns.resolveSrv(hostname)),
    safe(dns.resolvePtr(hostname)),
  ]);

  return { A, AAA, MX, TXT, NS, CNAME, SOA, SRV, PTR };
}

const safe = <T,>(prom: Promise<T>): Promise<T | undefined> => prom.catch(() => undefined);

const INFO = `
## DNS Records

DNS (Domain Name System) records are like an address book for the internet, providing essential information about a domain. They include records such as A, CNAME, MX, TXT, and NS. A records map domain names to IP addresses, CNAME records provide aliases for domains, MX records specify mail servers for domain emails, TXT records hold additional text information, and NS records indicate the authoritative name servers handling DNS queries for a domain. These records are crucial for routing internet traffic, managing emails, verifying domain ownership, and implementing various services and security measures.
`.trim();
