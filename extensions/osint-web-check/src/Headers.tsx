import got from "got";
import useSWR from "swr";
import { Action, ActionPanel, Detail, List } from "@raycast/api";

type HeadersProps = { url: string };

export function Headers({ url }: HeadersProps) {
  const { data, isLoading } = useSWR(["headers", url], ([, url]) => getHeaders(url));

  const items = Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]);

  return (
    <List.Item
      title="HTTP Headers"
      keywords={["HTTP Headers"]}
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
          {items.map(([key, value]) => (
            <Action.CopyToClipboard key={key} title={`Copy ${key} To Clipboard`} content={value} />
          ))}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {items.map(([key, value]) => (
                  <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                ))}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getHeaders(url: string) {
  return got(url).then((res) => res.headers);
}

const INFO = `
## HTTP Headers

HTTP headers are often used for various purposes like controlling caching behavior, handling cookies, securing connections, and providing additional information about the request or response. They help in the proper communication and functioning of the HTTP protocol between clients and servers.

HTTP headers in OSINT are used for tasks such as analyzing website information, identifying vulnerabilities and misconfigurations, tracking redirection and user-agent details, providing insights into a website's security posture, and gathering intelligence about a target. They offer valuable information about servers, technologies, and website behavior, aiding OSINT analysts in their investigations.
`.trim();
