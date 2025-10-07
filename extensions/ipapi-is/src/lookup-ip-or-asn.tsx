import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { type ASN, ASNRespones, ErrorResponse, IPResponse, SuccessResponse } from "./types";

export default function LookupIPorASN(props: LaunchProps<{ arguments: Arguments.LookupIpOrAsn }>) {
  const { ip = "" } = props.arguments;
  const { isLoading, data, revalidate } = useFetch<SuccessResponse | ErrorResponse>(`https://api.ipapi.is?q=${ip}`, {
    async onData(data) {
      if ("error" in data) await showFailureToast(data.error);
    },
  });

  const ipIsASN = ip.toUpperCase().includes("AS");
  const markdownHeading =
    (ipIsASN ? `# ASN: ${ip}` : `# IP: ${ip || "Your IP"}`) +
    `
---
`;
  const markdown = !data ? markdownHeading : markdownHeading + ("error" in data ? `Error: ${data.error}` : "");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Time Elapsed (ms)" text={data.elapsed_ms.toString()} />
            {"error" in data ? (
              <Detail.Metadata.Label title="Error" text={data.error} />
            ) : "ip" in data ? (
              <IpMetadata data={data} />
            ) : (
              <AsnMetadata data={data} />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(data)} />
            <Action title="Revalidate IP or ASN" icon={Icon.Redo} onAction={() => revalidate()} />
          </ActionPanel>
        )
      }
    />
  );
}

function IpMetadata({ data }: { data: IPResponse }) {
  return (
    <>
      <Detail.Metadata.Label title="IP" text={data.ip} />
      <Detail.Metadata.Label title="Regional Internet Registry" text={data.rir} />
      <Detail.Metadata.Label title="Bogon (Non Routable)" icon={data.is_bogon ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="Mobile ISP" icon={data.is_mobile ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="Crawler" icon={data.is_crawler ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="Datacenter" icon={data.is_datacenter ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="TOR Exit Node" icon={data.is_tor ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="Proxy Exit Node" icon={data.is_proxy ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="VPN Exit Node" icon={data.is_vpn ? Icon.Check : Icon.Xmark} />
      <Detail.Metadata.Label title="Abuser" icon={data.is_abuser ? Icon.Check : Icon.Xmark} />

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="DATACENTER" text="..." />
      {data.datacenter && (
        <>
          <Detail.Metadata.Label title="Datacenter" text={data.datacenter.datacenter} />
          <Detail.Metadata.Label title="Network" text={data.datacenter.network} />
          <Detail.Metadata.Label title="Domain" text={data.datacenter.domain} />
          <Detail.Metadata.Label title="Region" text={data.datacenter.region} />
          <Detail.Metadata.Label title="Service" text={data.datacenter.service} />
          <Detail.Metadata.Label title="Network Border Group" text={data.datacenter.network_border_group} />
          <Detail.Metadata.Label title="Code" text={data.datacenter.code} />
          <Detail.Metadata.Label title="City" text={data.datacenter.city} />
          <Detail.Metadata.Label title="State" text={data.datacenter.state} />
          <Detail.Metadata.Label title="Name" text={data.datacenter.name} />
          <Detail.Metadata.Label title="Country" text={data.datacenter.country} />
        </>
      )}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="COMPANY" text="..." />
      {data.company && (
        <>
          <Detail.Metadata.Label title="Name" text={data.company.name} />
          <Detail.Metadata.Label
            title="Domain"
            text={data.company.domain.includes("http") ? data.company.domain : `https://${data.company.domain}`}
          />
          <Detail.Metadata.Label title="Type" text={data.company.type} />
          <Detail.Metadata.Label title="Network" text={data.company.network} />
          <Detail.Metadata.Link title="WHOIS" text={data.company.whois} target={data.company.whois} />
        </>
      )}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="ABUSE" text="..." />
      {data.abuse && (
        <>
          <Detail.Metadata.Label title="Name" text={data.abuse.name} />
          <Detail.Metadata.Label title="Address" text={data.abuse.address} />
          <Detail.Metadata.Label title="Country" text={data.abuse.country} />
          <Detail.Metadata.Link title="Email" text={data.abuse.email} target={`mailto:${data.abuse.email}`} />
          <Detail.Metadata.Link title="Phone" text={data.abuse.phone} target={`tel:${data.abuse.phone}`} />
        </>
      )}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="ASN" text="..." />
      {data.asn && <ASN data={data.asn} />}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="LOCATION" text="..." />
      {data.location && (
        <>
          <Detail.Metadata.Label title="EU Member" icon={data.location.is_eu_member ? Icon.Check : Icon.Xmark} />
          <Detail.Metadata.Label title="Continent" text={data.location.continent} />
          <Detail.Metadata.Label title="Country" text={data.location.country} />
          <Detail.Metadata.Label title="Country Code" text={data.location.country_code} />
          <Detail.Metadata.Label title="State" text={data.location.state} />
          <Detail.Metadata.Label title="City" text={data.location.city} />
          <Detail.Metadata.Label title="Latitude" text={data.location.latitude.toString()} />
          <Detail.Metadata.Label title="Longitude" text={data.location.longitude.toString()} />
          <Detail.Metadata.Label title="ZIP" text={data.location.zip} />
          <Detail.Metadata.Label title="Timezone" text={data.location.timezone} />
          <Detail.Metadata.Label title="Local Time" text={data.location.local_time} />
          <Detail.Metadata.Label title="Local Time (UNIX)" text={data.location.local_time_unix.toString()} />
          <Detail.Metadata.Label title="Daylight Saving Time" icon={data.location.is_dst ? Icon.Check : Icon.Xmark} />
          {data.location.other?.length && (
            <Detail.Metadata.TagList title="Other">
              {data.location.other.map((o) => (
                <Detail.Metadata.TagList.Item key={o} text={o} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </>
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="VPN" text="..." />
      {data.vpn && (
        <>
          <Detail.Metadata.Label title="Region" text={data.vpn.region} />
          <Detail.Metadata.Label title="Last Seen" text={data.vpn.last_seen.toString()} />
          <Detail.Metadata.Label title="Type" text={data.vpn.type} />
          <Detail.Metadata.Label title="Service" text={data.vpn.service} />
          <Detail.Metadata.Link title="URL" text={data.vpn.url} target={data.vpn.url} />
        </>
      )}
    </>
  );
}

function ASN({ data }: { data: ASN }) {
  return (
    <>
      <Detail.Metadata.Label title="ASN" text={data.asn.toString()} />
      <Detail.Metadata.Label title="Abuser Score" text={data.abuser_score} />
      <Detail.Metadata.Label title="Description" text={data.descr} />
      <Detail.Metadata.Label
        title="Country"
        icon={{ source: `https://flagsapi.com/${data.country.toUpperCase()}/flat/64.png`, fallback: Icon.Map }}
        text={data.country}
      />
      <Detail.Metadata.Label title="Active" icon={data.active ? Icon.Check : Icon.Xmark} />
      {data.org && <Detail.Metadata.Label title="Organization" text={data.org} />}
      {data.abuse &&
        (data.abuse instanceof Array ? (
          <Detail.Metadata.TagList title="Abuse">
            {data.abuse.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
        ) : (
          <Detail.Metadata.Link title="Abuse" text={data.abuse} target={"mailto:" + data.abuse} />
        ))}
      {data.domain && <Detail.Metadata.Link title="Domain" text={data.domain} target={"https://" + data.domain} />}
      {data.type && <Detail.Metadata.Label title="Type" text={data.type} />}
      {data.created && <Detail.Metadata.Label title="Created" text={data.created} />}
      {data.updated && <Detail.Metadata.Label title="Updated" text={data.updated} />}
      {data.rir && <Detail.Metadata.Label title="Regional Internet Registry" text={data.rir} />}
      <Detail.Metadata.Label title="WHOIS" text={data.whois} />
      {data.route && <Detail.Metadata.Label title="Route" text={data.route} />}
    </>
  );
}
function AsnMetadata({ data }: { data: ASNRespones }) {
  return (
    <>
      <ASN data={data} />
      {data.prefixes && (
        <Detail.Metadata.TagList title="Prefixes">
          {data.prefixes.map((prefix) => (
            <Detail.Metadata.TagList.Item key={prefix} text={prefix} />
          ))}
        </Detail.Metadata.TagList>
      )}
      {data.prefixesIPv6 && (
        <Detail.Metadata.TagList title="Prefixes (IPv6)">
          {data.prefixesIPv6.map((prefix) => (
            <Detail.Metadata.TagList.Item key={prefix} text={prefix} />
          ))}
        </Detail.Metadata.TagList>
      )}
    </>
  );
}
