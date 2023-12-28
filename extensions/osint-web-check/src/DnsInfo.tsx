import * as React from "react";
import * as dns from "node:dns/promises";
import useSWR from "swr";
import { List } from "@raycast/api";
import { Fragment } from "react";

type DnsInfoProps = {
  url: string;
};

/**
 * TODO: Action list
 */
export function DnsInfo({ url }: DnsInfoProps) {
  const { data, isLoading } = useSWR(["dns-info", url], ([, url]) => getDnsInfo(url));

  return (
    <List.Item
      title="DNS Info"
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
