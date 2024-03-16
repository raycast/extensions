import got from "got";
import { useCheckDetail } from "./utils/useCheckDetail";
import { WebCheckComponentProps } from "./utils/types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Fragment } from "react";

export function SecurityTxt({ url, enabled }: WebCheckComponentProps) {
  const { isLoading, data } = useCheckDetail({ keyPrefix: "securityTxt", url, fetcher: getSecurityTxt, enabled });

  return (
    <List.Item
      title="Security.txt"
      actions={
        data &&
        data.isFound && (
          <ActionPanel>
            <Action.OpenInBrowser url={new URL(data.foundAt, url).toString()} />
            <Action.CopyToClipboard title="Copy Contents" content={data.content} />
          </ActionPanel>
        )
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={data?.content && `\`\`\`\n${data.content}\n\`\`\``}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Present?"
                  icon={
                    data.isFound
                      ? { source: Icon.CheckCircle, tintColor: "raycast-green" }
                      : { source: Icon.XMarkCircle, tintColor: "raycast-red" }
                  }
                />
                {data.isFound && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Label
                      title="Is PGP Signed?"
                      icon={
                        data.isPgpSigned
                          ? { source: Icon.CheckCircle, tintColor: "raycast-green" }
                          : { source: Icon.XMarkCircle, tintColor: "raycast-red" }
                      }
                    />
                    <List.Item.Detail.Metadata.Label title="Found At" text={data.foundAt} />

                    <List.Item.Detail.Metadata.Separator />

                    {data.fields.map(({ key, value }) => (
                      <List.Item.Detail.Metadata.Label key={`${key}-${value}`} title={key} text={value} />
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

async function getSecurityTxt(url: string) {
  for (const securityTextPath of SECURITY_TXT_PATHS) {
    const res = await got(new URL(securityTextPath, url))
      .then((res) => res.body)
      .catch(() => "");

    if (!res || res.includes("<html")) continue;

    return {
      isFound: true,
      foundAt: securityTextPath,
      content: res,
      isPgpSigned: res.includes("-----BEGIN PGP SIGNED MESSAGE-----"),
      fields: getFieldsFromSecurityTxt(res),
    } as const;
  }

  return { isFound: false } as const;
}

function getFieldsFromSecurityTxt(content: string) {
  const fieldSplitRegexp = /^([^:]+):\s*(.+)$/;

  return content
    .split("\n")
    .filter((line) => !line.startsWith("#") && !line.startsWith("------"))
    .map((line) => line.match(fieldSplitRegexp)?.slice(1) ?? [])
    .filter((line) => line.length === 2)
    .map(([key, value]) => ({ key, value }));
}

const SECURITY_TXT_PATHS = ["/security.txt", "/.well-known/security.txt"];
