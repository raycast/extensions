import { Color, List, ActionPanel, Image } from "@raycast/api";
import { GitLabIcons } from "../../icons";
import { ensureCleanAccessories, toDateString } from "../../utils";
import { GitLabOpenInBrowserAction } from "../actions";
import { getCIJobStatusIcon } from "../jobs";
import { Commit } from "./list";
import { useCommitStatus } from "./utils";

export function CommitListItem(props: { commit: Commit; projectID: number }): JSX.Element {
  const commit = props.commit;
  const projectID = props.projectID;
  const { commitStatus: status } = useCommitStatus(projectID, commit.id);
  const icon: Image.ImageLike = status?.author?.avatar_url
    ? { source: status.author.avatar_url, mask: Image.Mask.Circle }
    : { source: GitLabIcons.commit, tintColor: Color.Green };
  const statusIcon: Image.ImageLike | undefined = status?.status ? getCIJobStatusIcon(status.status) : undefined;
  return (
    <List.Item
      key={commit.id}
      title={commit.title}
      icon={icon}
      accessories={ensureCleanAccessories([{ text: toDateString(commit.created_at) }, { icon: statusIcon }])}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={commit.web_url} />
        </ActionPanel>
      }
    />
  );
}
