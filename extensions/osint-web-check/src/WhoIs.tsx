import * as net from "node:net";
import { List } from "@raycast/api";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function WhoIs({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "whois", url, enabled, fetcher: getWhoIs });

  return (
    <List.Item
      title="WHOIS"
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={data && `\`\`\`${data.raw}\`\`\``}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {data.parsed["Domain Name"] && (
                  <List.Item.Detail.Metadata.Label title="Domain Name" text={data.parsed["Domain Name"]} />
                )}
                {data.parsed["Name Server"] && (
                  <List.Item.Detail.Metadata.Label title="Name Server" text={data.parsed["Name Server"]} />
                )}
                {data.parsed["Creation Date"] && (
                  <List.Item.Detail.Metadata.Label title="Creation Date" text={data.parsed["Creation Date"]} />
                )}
                {data.parsed["Updated Date"] && (
                  <List.Item.Detail.Metadata.Label title="Updated Date" text={data.parsed["Updated Date"]} />
                )}
                {data.parsed["Registry Expiry Date"] && (
                  <List.Item.Detail.Metadata.Label
                    title="Registry Expiry Date"
                    text={data.parsed["Registry Expiry Date"]}
                  />
                )}
                {data.parsed["Registry Domain ID"] && (
                  <List.Item.Detail.Metadata.Label
                    title="Registry Domain ID"
                    text={data.parsed["Registry Domain ID"]}
                  />
                )}
                {data.parsed["Registrar"] && (
                  <List.Item.Detail.Metadata.Label title="Registrar" text={data.parsed["Registrar"]} />
                )}
                {data.parsed["Registrar IANA ID"] && (
                  <List.Item.Detail.Metadata.Label title="Registrar IANA ID" text={data.parsed["Registrar IANA ID"]} />
                )}
                {data.parsed["Domain Status"] && (
                  <List.Item.Detail.Metadata.Label title="Domain Status" text={data.parsed["Domain Status"]} />
                )}
                {data.parsed["DNSSEC"] && (
                  <List.Item.Detail.Metadata.Label title="DNSSEC" text={data.parsed["DNSSEC"]} />
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getWhoIs(url: string) {
  const domain = new URL(url).host;

  const data = await new Promise<string>((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: "whois.internic.net" }, () => {
      client.write(`${domain}\r\n`);
    });

    let buffer = "";
    client.on("data", (data) => {
      buffer += data.toString();
    });
    client.on("end", () => {
      client.destroy();
      resolve(buffer);
    });
    client.on("error", (err) => {
      client.destroy();
      reject(err);
    });
  });

  return parseWhoIsData(data);
}

function parseWhoIsData(data: string) {
  const lines = data.split("\n");
  const result: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/(.*?):(.*)/);

    if (!match) continue;

    const [, key, value] = match;
    result[key.trim()] = value.trim();
  }

  return { raw: data, parsed: result as WhoIsSchema };
}

type WhoIsSchema = {
  "Domain Name"?: string;
  "Registry Domain ID"?: string;
  "Registrar WHOIS Server"?: string;
  "Registrar URL"?: string;
  "Updated Date"?: string;
  "Creation Date"?: string;
  "Registry Expiry Date"?: string;
  Registrar?: string;
  "Registrar IANA ID"?: string;
  "Registrar Abuse Contact Email"?: string;
  "Registrar Abuse Contact Phone"?: string;
  "Domain Status"?: string;
  "Name Server"?: string;
  DNSSEC?: string;
};
