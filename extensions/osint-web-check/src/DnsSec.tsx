import got from "got";
import useSWR from "swr";
import { Icon, List } from "@raycast/api";
import { Fragment } from "react";

type DnsSecProps = { url: string };

export function DnsSec({ url }: DnsSecProps) {
  const { data, isLoading } = useSWR(["dns-sec", url], ([, url]) => getDnsSecInfo(url));

  return (
    <List.Item
      title="DNSSEC Info"
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {data.map(({ type, values }, i) => (
                  <Fragment key={type}>
                    <List.Item.Detail.Metadata.Label
                      title={type}
                      icon={values?.Status ? Icon.CheckCircle : Icon.XMarkCircle}
                    />
                    <List.Item.Detail.Metadata.Label title="Recursion Desired (RD)" text={values?.RD ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Label
                      title="Recursion Available (RA)"
                      text={values?.RA ? "Yes" : "No"}
                    />
                    <List.Item.Detail.Metadata.Label title="TrunCation (TC)" text={values?.TC ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Label title="Authentic Data (AD)" text={values?.AD ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Label title="Checking Disabled (CD)" text={values?.CD ? "Yes" : "No"} />
                    {i < data.length - 1 && <List.Item.Detail.Metadata.Separator />}
                  </Fragment>
                ))}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getDnsSecInfo(url: string) {
  const domain = new URL(url).hostname;

  return Promise.all(
    DNS_TYPES.map(async (t) => {
      try {
        const u = new URL("https://dns.google/resolve");
        u.searchParams.set("name", domain);
        u.searchParams.set("type", t);

        const r = await got(u, {
          method: "GET",
          headers: {
            Accept: "application/dns-json",
          },
        }).then(
          (r) =>
            JSON.parse(r.body) as {
              Status?: number;
              TC?: boolean;
              RD?: boolean;
              RA?: boolean;
              AD?: boolean;
              CD?: boolean;
            },
        );

        return { type: t, isFound: true, values: r };
      } catch {
        return { type: t, isFound: false, values: null };
      }
    }),
  );
}

const DNS_TYPES = ["DNSKEY", "DS", "RRSIG"];
