import { Color, List, ActionPanel, Image } from "@raycast/api";
import { GitLabIcons } from "../../icons";
import { capitalizeFirstLetter } from "../../utils";
import { GitLabOpenInBrowserAction } from "../actions";
import { getCIJobStatusIcon } from "../jobs";
import { Commit } from "./list";
import { useCommitStatus } from "./utils";

export function CommitListItem(props: { commit: Commit; projectID: number }) {
  const commit = props.commit;
  const projectID = props.projectID;
  const { commitStatus: status } = useCommitStatus(projectID, commit.id);
  const icon: Image.ImageLike = status?.author?.avatar_url
    ? { source: status.author.avatar_url, mask: Image.Mask.Circle }
    : { source: GitLabIcons.commit, tintColor: Color.Green };
  const statusIcon: Image.ImageLike | undefined = status?.status
    ? getCIJobStatusIcon(status.status, status.allow_failure)
    : undefined;

  return (
    <List.Item
      key={commit.id}
      title={commit.title}
      icon={{ value: icon, tooltip: `Author: ${commit.author_name}` }}
      accessories={[
        { date: new Date(commit.created_at), tooltip: `Created: ${new Date(commit.created_at).toLocaleString()}` },
        { icon: statusIcon, tooltip: status?.status ? `Status: ${capitalizeFirstLetter(status.status)}` : undefined },
      ]}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={commit.web_url} />
        </ActionPanel>
      }
    />
  );
}
