import * as net from "node:net";
import useSWR from "swr";
import { List } from "@raycast/api";

type WhoIsProps = { url: string };

// TODO: this isn't working...
export function WhoIs({ url }: WhoIsProps) {
  const { data, isLoading } = useSWR(["who-is", url], ([, url]) => getWhoIs(url));

  return (
    <List.Item
      title="WHOIS"
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Domain Name" text={data["Domain Name"]} />
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );

  /**
   * <div>Domain Name: {data["Domain Name"]}</div>
      <div>Creation Date: {data["Creation Date"]}</div>
      <div>Updated Date: {data["Updated Date"]}</div>
      <div>Registry Expiry Date: {data["Registry Expiry Date"]}</div>
      <div>Registry Domain ID: {data["Registry Domain ID"]}</div>
      <div>Registrar: {data["Registrar"]}</div>
      <div>Registrar IANA ID: {data["Registrar IANA ID"]}</div>
   */
}

async function getWhoIs(url: string) {
  const hostname = new URL(url).hostname;

  const data = await new Promise<string>((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: "whois.internic.net" }, () => {
      client.write(`${hostname}\r\n`);
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

  let lastKey = "";
  for (const line of lines) {
    const [key, value] = line.split(":").map((s) => s.trim());

    if (!value) {
      result[lastKey] += line;
      continue;
    }

    lastKey = key;
    result[key] = value;
  }

  console.log(Object.keys(result));

  return result as WhoIsSchema;
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
