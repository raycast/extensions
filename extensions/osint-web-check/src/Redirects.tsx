import got from "got";
import useSWR from "swr";
import { Action, ActionPanel, Detail, List } from "@raycast/api";

type RedirectsProps = { url: string };

export function Redirects({ url }: RedirectsProps) {
  const { data, isLoading } = useSWR(["redirects", url], ([, url]) => getRedirects(url));

  const content = (() => {
    if (!data || data.length === 0) return "## No Redirects";

    const bits = ["## Redirects", ""];

    for (const redirect of data) {
      bits.push(`- \`${redirect.from}\` -> \`${redirect.to}\``);
    }

    return bits.join("\n");
  })();

  return (
    <List.Item
      title="Redirects"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
        </ActionPanel>
      }
      detail={<List.Item.Detail isLoading={isLoading} markdown={content} />}
    />
  );
}

async function getRedirects(url: string) {
  let from = url;
  const redirects = [] as { from: string; to: string }[];

  await got(url, {
    followRedirect: true,
    hooks: {
      beforeRedirect: [
        // @ts-expect-error hush now, @types/got
        (_, response) => {
          const to = response.headers.location;
          redirects.push({ from, to });
          from = to;
        },
      ],
    },
  });

  return redirects;
}

const INFO = `
## HTTP Redirects

This tool tracks HTTP redirects for the provided URL. 
`.trim();
