import got from "got";
import useSWR from "swr";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Fragment } from "react";

type CrawlRulesProps = { url: string };

export function CrawlRules({ url }: CrawlRulesProps) {
  const { data, isLoading } = useSWR(["crawl-rules", url], ([, url]) => getRobotsTxt(url));

  return (
    <List.Item
      title="robots.txt / Crawl Rules"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
          {data?.body && <Action.CopyToClipboard title="Copy robots.txt Content To Clipboard" content={data.body} />}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={data && (data.body ? `\`\`\`\n${data.body}\`\`\`` : "### `/robots.txt` not found")}
          metadata={
            data &&
            data.body && (
              <List.Item.Detail.Metadata>
                {data.sitemap && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Label title="Sitemap" text={data.sitemap} />
                    <List.Item.Detail.Metadata.Separator />
                  </Fragment>
                )}

                {data.allowed.length > 0 && (
                  <Fragment>
                    {data.allowed.map((item) => (
                      <List.Item.Detail.Metadata.Label key={item} title="Allowed" text={item} />
                    ))}
                    <List.Item.Detail.Metadata.Separator />
                  </Fragment>
                )}

                {data.disallowed.length > 0 &&
                  data.disallowed.map((item) => (
                    <List.Item.Detail.Metadata.Label key={item} title="Disallowed" text={item} />
                  ))}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

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
      allowed.push(line);
    }
  }

  return { allowed: allowed.filter(Boolean), disallowed, sitemap, body };
}

const INFO = `
## robots.txt / Crawl Rules

The robots.txt file is used to communicate instructions to web crawlers or robots, specifying which parts of a website should not be accessed or crawled. It helps control the behavior of search engine crawlers and ensures privacy or protection of sensitive information.

Robots.txt can be used for OSINT by analyzing the file to gather information about a website's directory structure, hidden paths, or restricted areas. This information can aid in reconnaissance, identifying potential vulnerabilities, or understanding the website's content organization.
`.trim();
