import { Action, ActionPanel, Clipboard, Color, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";

import type { Link } from "../api/types";
import { dashLinkRecordingsUrl, dashLinksUrl } from "../utils/dash-urls";
import { formatRelativeTime } from "../utils/format";

interface LinkSuccessProps {
  link: Link;
  workspaceId: string;
  workspaceName?: string;
}

function truncateMiddle(value: string, max = 56): string {
  if (value.length <= max) return value;
  const keep = max - 1;
  const front = Math.ceil(keep / 2);
  const back = Math.floor(keep / 2);
  return `${value.slice(0, front)}…${value.slice(value.length - back)}`;
}

function ensureHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function buildMarkdown(link: Link): string {
  const truncated = truncateMiddle(link.linkURL);
  return [
    "# Link created",
    "",
    "It's copied to your clipboard — share it to start a recording session.",
    "",
    "```",
    truncated,
    "```",
  ].join("\n");
}

export function LinkSuccess({ link, workspaceId, workspaceName }: LinkSuccessProps) {
  const { pop } = useNavigation();

  async function handleCopy() {
    await Clipboard.copy(link.linkURL);
    await showToast({ style: Toast.Style.Success, title: "URL copied" });
  }

  const created = formatRelativeTime(link.createdAt) || "just now";
  const reusable = link.linkReusable;
  const domainTarget = ensureHttps(link.domain.url);

  return (
    <Detail
      navigationTitle="Link Created"
      markdown={buildMarkdown(link)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item
              text={reusable ? "Reusable" : "Single-use"}
              color={reusable ? Color.Green : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Domain" text={link.domain.url} target={domainTarget} />
          {link.project.title ? <Detail.Metadata.Label title="Project" text={link.project.title} /> : null}
          {workspaceName ? <Detail.Metadata.Label title="Workspace" text={workspaceName} /> : null}
          {link.linkProviderReference ? (
            <Detail.Metadata.Label title="Reference" text={link.linkProviderReference} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={created} />
          <Detail.Metadata.Label title="Created by" text={link.creator.name} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Copy Link URL" icon={Icon.CopyClipboard} onAction={handleCopy} />
          <Action
            title="Create Another Link"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              pop();
            }}
          />
          <Action.OpenInBrowser title="Open Link" icon={Icon.Globe} url={link.linkURL} />
          <ActionPanel.Section title="Dashboard">
            <Action.OpenInBrowser
              title="View Recordings for This Link"
              icon={Icon.Video}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              url={dashLinkRecordingsUrl(workspaceId, link.linkId)}
            />
            <Action.OpenInBrowser
              title="View All Links in Dashboard"
              icon={Icon.List}
              url={dashLinksUrl({ workspaceId })}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
