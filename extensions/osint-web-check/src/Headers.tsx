import got from "got";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { lowerCaseKeys } from "./utils/lowerCaseKeys";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function Headers({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "headers", url, enabled, fetcher: getHeaders });

  const items = Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]);

  return (
    <List.Item
      title="HTTP Headers"
      keywords={["HTTP Headers", "CSP"]}
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
                {/* Security-related headers */}
                <List.Item.Detail.Metadata.Label title="Security Headers" />
                {SECURITY_HEADERS.map((headerName) => {
                  const headerValue = data[headerName];

                  return (
                    <List.Item.Detail.Metadata.Label
                      key={headerName}
                      title={headerName}
                      text={headerValue ? String(headerValue) : undefined}
                      icon={
                        headerValue
                          ? { source: Icon.CheckCircle, tintColor: "raycast-green" }
                          : { source: Icon.XMarkCircle, tintColor: "raycast-red" }
                      }
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />

                {/* All headers */}
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

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "x-xss-protection",
];

async function getHeaders(url: string) {
  return got(url).then((res) => lowerCaseKeys(res.headers));
}

const INFO = `
## HTTP Headers

HTTP headers are often used for various purposes like controlling caching behavior, handling cookies, securing connections, and providing additional information about the request or response. They help in the proper communication and functioning of the HTTP protocol between clients and servers.

HTTP headers in OSINT are used for tasks such as analyzing website information, identifying vulnerabilities and misconfigurations, tracking redirection and user-agent details, providing insights into a website's security posture, and gathering intelligence about a target. They offer valuable information about servers, technologies, and website behavior, aiding OSINT analysts in their investigations.
`.trim();
