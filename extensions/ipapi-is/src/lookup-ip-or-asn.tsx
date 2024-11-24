import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { type ASN, ASNRespones, ErrorResponse, IPResponse, SuccessResponse } from "./types";
import { typesAndTitles } from "./constants";

export default function LookupIPorASN(props: LaunchProps<{ arguments: Arguments.LookupIpOrAsn }>) {
  const { ip } = props.arguments;
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
            {("error" in data) ? <Detail.Metadata.Label title="Error" text={data.error} /> : ("ip" in data) ? <IpMetadata data={data} /> : <AsnMetadata data={data} />}
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

function getItemTypeAndTitle(key: string) {
  return (
    typesAndTitles[key as keyof typeof typesAndTitles] || {
      type: "string",
      title: key.charAt(0).toUpperCase() + key.slice(1),
    }
  );
}
type ValueType = string | number | string[] | { [key: string]: string | number };
function mapItemsToDetailMetadata(key: string, val: ValueType) {
    const item = getItemTypeAndTitle(key);
    const title = item.title;
    if (item.type === "string" || item.type === "number")
      return (
        <Detail.Metadata.Label
          key={key}
          title={title}
          text={val ? val.toString() : ""}
          icon={!val ? Icon.Minus : undefined}
        />
      );
    else if (item.type === "boolean")
      return <Detail.Metadata.Label key={key} title={title} icon={val ? Icon.Check : Icon.Multiply} />;
    else if (item.type === "link")
      return (
        <Detail.Metadata.Link
          key={key}
          title={title}
          text={val.toString()}
          target={val.toString().includes("http") ? val.toString() : `https://${val}`}
        />
      );
    else if (item.type === "email")
      return <Detail.Metadata.Link key={key} title={title} text={val.toString()} target={`mailto:${val}`} />;
    else if (item.type === "phone")
      return <Detail.Metadata.Link key={key} title={title} text={val.toString()} target={`tel:${val}`} />;
  }

function IpMetadata({ data }: { data: IPResponse }) {
  return <>
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
    {data.datacenter && Object.entries(data.datacenter).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}

    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="COMPANY" text="..." />
    {data.company && Object.entries(data.company).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}
    
    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="ABUSE" text="..." />
    {data.abuse && Object.entries(data.abuse).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}
    
    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="ASN" text="..." />
    {data.asn && <ASN data={data.asn} />}

    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="LOCATION" text="..." />
    {data.location && Object.entries(data.location).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}
    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="VPN" text="..." />
    {data.vpn && Object.entries(data.vpn).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}
  </>;
}

function ASN({ data }: { data: ASN }) {
  return <>
  <Detail.Metadata.Label title="ASN" text={data.asn.toString()} />
    <Detail.Metadata.Label title="Abuser Score" text={data.abuser_score} />
    <Detail.Metadata.Label title="Description" text={data.descr} />
    <Detail.Metadata.Label title="Country" 
    icon={{ source: `https://flagsapi.com/${data.country.toUpperCase()}/flat/64.png`, fallback: Icon.Map }}
    text={data.country} />
    <Detail.Metadata.Label title="Active" icon={data.active ? Icon.Check : Icon.Xmark} />
    {data.org && <Detail.Metadata.Label title="Organization" text={data.org} />}
    {data.abuse && ((data.abuse instanceof Array) ? <Detail.Metadata.TagList title="Abuse">{data.abuse.map(tag => <Detail.Metadata.TagList.Item key={tag} text={tag} />)}</Detail.Metadata.TagList> : <Detail.Metadata.Link title="Abuse" text={data.abuse} target={"mailto:" + data.abuse} />)}
    {data.domain && <Detail.Metadata.Link title="Domain" text={data.domain} target={"https://" + data.domain} />}
    {data.type && <Detail.Metadata.Label title="Type" text={data.type} />}
    {data.created && <Detail.Metadata.Label title="Created" text={data.created} />}
    {data.updated && <Detail.Metadata.Label title="Updated" text={data.updated} />}
    {data.rir && <Detail.Metadata.Label title="Regional Internet Registry" text={data.rir} />}
    <Detail.Metadata.Label title="WHOIS" text={data.whois} />
    {data.route && <Detail.Metadata.Label title="Route" text={data.route} />}</>
}
function AsnMetadata({ data }: { data: ASNRespones }) {
  return <>
    <ASN data={data} />
    {data.prefixes && <Detail.Metadata.TagList title="Prefixes">
      {data.prefixes.map(prefix => <Detail.Metadata.TagList.Item key={prefix} text={prefix} />)}
    </Detail.Metadata.TagList>}
    {data.prefixesIPv6 && <Detail.Metadata.TagList title="Prefixes (IPv6)">
      {data.prefixesIPv6.map(prefix => <Detail.Metadata.TagList.Item key={prefix} text={prefix} />)}
    </Detail.Metadata.TagList>}
  </>  
}