import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useMemo } from "react";
import { GitLabIcons } from "../../icons";
import { copySecondaryShortcut, copyShortcut, formatDate, formatDateTime } from "../../utils";
import { GitLabOpenInBrowserAction } from "../actions";
import { getCIJobStatusIcon, getMRPipelineStatusTooltip } from "../jobs";
import { ShowCommitPipelineAction } from "./actions";
import { Commit } from "./types";

export function CommitListItem(props: { commit: Commit; projectFullPath?: string }) {
  const keywords = useMemo(
    () =>
      [props.commit.message, props.commit.author_name, props.commit.author_email].filter(
        (keyword): keyword is string => !!keyword,
      ),
    [props.commit.author_email, props.commit.author_name, props.commit.message],
  );

  return (
    <List.Item
      title={props.commit.title}
      keywords={keywords}
      icon={{
        value: props.commit.author_avatar_url
          ? { source: props.commit.author_avatar_url, mask: Image.Mask.Circle }
          : { source: GitLabIcons.commit, tintColor: Color.SecondaryText },
        tooltip: props.commit.author_name,
      }}
      accessories={[
        {
          icon: props.commit.pipeline_status ? getCIJobStatusIcon(props.commit.pipeline_status, false) : undefined,
          tooltip: props.commit.pipeline_status ? getMRPipelineStatusTooltip(props.commit.pipeline_status) : undefined,
        },
        {
          text: formatDate(props.commit.created_at),
          tooltip: `Created: ${formatDateTime(props.commit.created_at)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.projectFullPath && (
              <ShowCommitPipelineAction commit={props.commit} projectFullPath={props.projectFullPath} />
            )}
            <GitLabOpenInBrowserAction url={props.commit.web_url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={props.commit.web_url}
              shortcut={copyShortcut}
              icon={{ source: Icon.Link, tintColor: Color.PrimaryText }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy SHA"
              content={props.commit.id}
              shortcut={copySecondaryShortcut}
              icon={{ source: Icon.Hashtag, tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
