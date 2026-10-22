import { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";

import { callGeekflare, normalizeUrl, WEBSITE_CHECKS, type WebsiteCheck } from "./geekflare";

function CheckResult({ url, check }: { url: string; check: WebsiteCheck }) {
  const { path, title } = WEBSITE_CHECKS[check];
  const { data, isLoading } = usePromise((p: string, u: string) => callGeekflare(p, { url: u }), [path, url], {
    onError: (error) => {
      void showFailureToast(error, { title: `${title} failed` });
    },
  });
  const json = data ? JSON.stringify(data.data ?? data, null, 2) : "";
  const markdown = isLoading
    ? `# ${title}\n\nChecking ${url}…${check === "lighthouse" ? " Lighthouse can take a minute or more." : ""}`
    : `# ${title}\n\n${url}\n\n\`\`\`json\n${json}\n\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${title}: ${url}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result JSON" content={json} />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckWebsite }>) {
  const url = normalizeUrl(props.arguments.url);

  return (
    <List navigationTitle={`Check ${url}`} searchBarPlaceholder="Filter checks">
      {(Object.keys(WEBSITE_CHECKS) as WebsiteCheck[]).map((check) => (
        <List.Item
          key={check}
          title={WEBSITE_CHECKS[check].title}
          subtitle={url}
          icon={Icon.Shield}
          actions={
            <ActionPanel>
              <Action.Push title="Run Check" target={<CheckResult url={url} check={check} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
