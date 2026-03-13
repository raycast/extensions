import got from "got";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Fragment, useState } from "react";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function CrawlRules({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "crawl-rules", url, enabled, fetcher: getRobotsTxt });
  const [showAllInfo, setShowAllInfo] = useState(false);

  const allowedItems = (data?.allowed ?? []).slice(0, showAllInfo ? undefined : MAX_SHOWN);
  const disallowedItems = (data?.disallowed ?? []).slice(0, showAllInfo ? undefined : MAX_SHOWN);
  const body = showAllInfo
    ? data?.body
    : (data?.body ?? "")
        .split("\n")
        .slice(0, 2 * MAX_SHOWN + 10)
        .join("\n");
  const bodyMarkdown =
    Number(body?.length) < Number(data?.body?.length) ? `${body}\n(Use "Show All Items" action to show more)` : body;

  const isHidingItems =
    !showAllInfo && (Number(data?.allowed?.length) > MAX_SHOWN || Number(data?.disallowed?.length) > MAX_SHOWN);

  return (
    <List.Item
      title="robots.txt / Crawl Rules"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
          {isHidingItems && <Action title="Show All Items" onAction={() => setShowAllInfo(true)} />}
          {data?.body && <Action.CopyToClipboard title="Copy robots.txt Content To Clipboard" content={data.body} />}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={data && (body ? `\`\`\`\n${bodyMarkdown}\n\`\`\`` : "### `/robots.txt` not found")}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {data.sitemap && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Label title="Sitemap" text={data.sitemap} />
                    <List.Item.Detail.Metadata.Separator />
                  </Fragment>
                )}

                {allowedItems.length > 0 && (
                  <Fragment>
                    {allowedItems.map((item) => (
                      <List.Item.Detail.Metadata.Label key={item} title="Allowed" text={item} />
                    ))}
                    {allowedItems.length < data.allowed.length && (
                      <List.Item.Detail.Metadata.Label
                        title="Allowed"
                        text={`${data.allowed.length - allowedItems.length} more`}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                  </Fragment>
                )}

                {disallowedItems.length > 0 &&
                  disallowedItems.map((item) => (
                    <List.Item.Detail.Metadata.Label key={item} title="Disallowed" text={item} />
                  ))}
                {disallowedItems.length < data.disallowed.length && (
                  <List.Item.Detail.Metadata.Label
                    title="Disallowed"
                    text={`${data.disallowed.length - disallowedItems.length} more`}
                  />
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

const MAX_SHOWN = 25;

async function getRobotsTxt(url: string) {
  const u = new URL(url);
  u.pathname = "/robots.txt";

  const body = await got(u.toString())
    .then((res) => res.body || "")
    .catch(() => "");

  const lines = body.split("\n");

  const allowed: string[] = [],
    disallowed: string[] = [];
  let sitemap = "";

  for (const line of lines) {
    if (line.startsWith("#")) continue;

    if (/^sitemap/i.test(line)) {
      sitemap = line.replace(/^sitemap:\s*/i, "");
    } else if (/^disallow/i.test(line)) {
      disallowed.push(line.replace(/^disallow:\s*/i, ""));
    } else {
      allowed.push(line.replace(/^allow:\s*/i, ""));
    }
  }

  return { allowed: allowed.filter(Boolean), disallowed, sitemap, body };
}

const INFO = `
## robots.txt / Crawl Rules

The robots.txt file is used to communicate instructions to web crawlers or robots, specifying which parts of a website should not be accessed or crawled. It helps control the behavior of search engine crawlers and ensures privacy or protection of sensitive information.

Robots.txt can be used for OSINT by analyzing the file to gather information about a website's directory structure, hidden paths, or restricted areas. This information can aid in reconnaissance, identifying potential vulnerabilities, or understanding the website's content organization.
`.trim();
