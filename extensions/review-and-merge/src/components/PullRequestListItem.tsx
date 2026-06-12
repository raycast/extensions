import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { PullRequest } from "../github/types";
import { pullRequestAccessories } from "./accessories";
import { ApproveAction } from "./ApproveAction";
import { ApproveAllAction } from "./ApproveAllAction";
import { MergeAction } from "./MergeAction";
import { SmartMergeAction } from "./SmartMergeAction";
import { DisableAutoMergeAction } from "./DisableAutoMergeAction";

interface Props {
  pr: PullRequest;
  viewerLogin: string | undefined;
  onRefresh: () => void;
  approveFirst?: boolean;
  primaryMerge?: boolean;
  repoPullRequests?: PullRequest[];
  subtitle?: string;
  icon?: Image.ImageLike;
  accessories?: List.Item.Accessory[];
}

export function PullRequestListItem({
  pr,
  viewerLogin,
  onRefresh,
  approveFirst = false,
  primaryMerge = false,
  repoPullRequests,
  subtitle = `${pr.repo}#${pr.number}`,
  icon = pr.isDraft ? { source: Icon.CircleEllipsis } : { source: Icon.Circle },
  accessories = pullRequestAccessories(pr),
}: Props) {
  const approve = (
    <ApproveAction pr={pr} viewerLogin={viewerLogin} onRefresh={onRefresh} />
  );
  const open = <Action.OpenInBrowser url={pr.url} />;

  return (
    <List.Item
      key={pr.id}
      title={pr.title}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          {primaryMerge && <SmartMergeAction pr={pr} onRefresh={onRefresh} />}
          {approveFirst && approve}
          {open}
          {!approveFirst && approve}
          {!primaryMerge && <MergeAction pr={pr} onRefresh={onRefresh} />}
          {repoPullRequests && (
            <ApproveAllAction
              repo={pr.repo}
              pullRequests={repoPullRequests}
              viewerLogin={viewerLogin}
              onRefresh={onRefresh}
            />
          )}
          <Action.CopyToClipboard
            title="Copy URL"
            content={pr.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Branch Name"
            content={pr.headRefName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          {primaryMerge && (
            <DisableAutoMergeAction pr={pr} onRefresh={onRefresh} />
          )}
        </ActionPanel>
      }
    />
  );
}
