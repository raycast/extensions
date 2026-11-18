import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

export function TokenResultDetail({
  title,
  url,
  token,
  status,
  urlLabel = "URL",
}: {
  title: string;
  url: string;
  token: string;
  status: string;
  urlLabel?: string;
}) {
  const markdown = [
    `# ${title}`,
    "",
    `## ${urlLabel}`,
    url ? "```\n" + url + "\n```" : "—",
    "",
    "## Token",
    token ? "```\n" + token + "\n```" : "—",
  ].join("\n");

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {url !== "" && <Action.CopyToClipboard title={`Copy ${urlLabel}`} content={url} />}
          {token !== "" && <Action.CopyToClipboard title="Copy Token" content={token} />}
          {url !== "" && <Action.OpenInBrowser title="Open URL in Browser" icon={Icon.Globe} url={url} />}
        </ActionPanel>
      }
    />
  );
}
