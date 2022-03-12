import { ImageLike, ImageMask, Color, List, ActionPanel } from "@raycast/api";
import { GitLabIcons } from "../../icons";
import { GitLabOpenInBrowserAction } from "../actions";
import { getCIJobStatusIcon } from "../jobs";
import { Commit } from "./list";
import { useCommitStatus } from "./utils";

export function CommitListItem(props: { commit: Commit; projectID: number }): JSX.Element {
  const commit = props.commit;
  const projectID = props.projectID;
  const { commitStatus: status } = useCommitStatus(projectID, commit.id);
  const icon: ImageLike = status?.author?.avatar_url
    ? { source: status.author.avatar_url, mask: ImageMask.Circle }
    : { source: GitLabIcons.commit, tintColor: Color.Green };
  const statusIcon: ImageLike | undefined = status?.status ? getCIJobStatusIcon(status.status) : undefined;
  return (
    <List.Item
      key={commit.id}
      title={commit.title}
      icon={icon}
      accessoryIcon={statusIcon}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={commit.web_url} />
        </ActionPanel>
      }
    />
  );
}
