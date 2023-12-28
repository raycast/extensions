import { lookup } from "node:dns/promises";
import useSWR from "swr";
import { Action, ActionPanel, List } from "@raycast/api";

type UrlIpProps = { url: string };

export function UrlIp({ url }: UrlIpProps) {
  const { data, isLoading } = useSWR(["url-ip", url], ([, url]) => getUrlIP(url));

  return (
    <List.Item
      title="IP Info"
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy IP Address" content={data.address} />
          </ActionPanel>
        )
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="IP Address" text={data.address} />
                <List.Item.Detail.Metadata.Label title="IP Family" text={`v${data.family}`} />
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

async function getUrlIP(url: string) {
  const hostname = new URL(url).hostname;
  return await lookup(hostname);
}
