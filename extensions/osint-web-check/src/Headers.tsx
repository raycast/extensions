import got from "got";
import useSWR from "swr";
import { Action, ActionPanel, List } from "@raycast/api";

type HeadersProps = { url: string };

export function Headers({ url }: HeadersProps) {
  const { data, isLoading } = useSWR(["headers", url], ([, url]) => getHeaders(url));

  const items = Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]);

  return (
    <List.Item
      title="HTTP Headers"
      keywords={["HTTP Headers"]}
      actions={
        data && (
          <ActionPanel>
            {items.map(([key, value]) => (
              <Action.CopyToClipboard key={key} title={`Copy ${key} To Clipboard`} content={value} />
            ))}
          </ActionPanel>
        )
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
