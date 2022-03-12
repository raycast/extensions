import { ImageLike, ImageMask, Color, List, ActionPanel } from "@raycast/api";
import { useCache } from "../../cache";
import { gitlab } from "../../common";
import { GitLabIcons } from "../../icons";
import { GitLabOpenInBrowserAction } from "../actions";
import { getCIJobStatusIcon } from "../jobs";
import { Commit, CommitStatus } from "./list";

export async function getCommitStatus(projectID: number, sha: string): Promise<CommitStatus | undefined> {
  const status: CommitStatus | undefined = await gitlab
    .fetch(`projects/${projectID}/repository/commits/${sha}/statuses`)
    .then((d) => {
      if (d && d.length > 0) {
        return d[0] as CommitStatus;
      }
      return undefined;
    });
  return status;
}

export function CommitListItem(props: { commit: Commit; projectID: number }): JSX.Element {
  const commit = props.commit;
  const projectID = props.projectID;
  const { data: status } = useCache<CommitStatus | undefined>(
    `project_commit_status_${projectID}_${commit.id}`,
    async (): Promise<CommitStatus | undefined> => {
      return await getCommitStatus(projectID, commit.id);
    },
    {
      deps: [commit, projectID],
      secondsToRefetch: 30,
    }
  );
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
