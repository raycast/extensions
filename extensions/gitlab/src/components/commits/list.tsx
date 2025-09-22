import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { useState } from "react";
import urljoin from "url-join";
import { useCache } from "../../cache";
import { gitlab } from "../../common";
import { Project, User } from "../../gitlabapi";
import { GitLabIcons } from "../../icons";
import { capitalizeFirstLetter, showErrorToast } from "../../utils";
import { GitLabOpenInBrowserAction } from "../actions";
import { Event } from "../event";
import { getCIJobStatusIcon, PipelineJobsListByCommit } from "../jobs";
import { MyProjectsDropdown } from "../project";
import { CommitListItem } from "./item";
import { useCommitStatus } from "./utils";

function EventCommitListItem(props: { event: Event }) {
  const e = props.event;
  const commit = e.push_data?.commit_to;
  const ref = e.push_data?.ref;
  const title = e.push_data?.commit_title || "no title";
  const { data: project } = useCache<Project | undefined>(
    `event_project_${e.project_id}`,
    async (): Promise<Project | undefined> => {
      const pro = await gitlab.getProject(e.project_id);
      return pro;
    },
    {
      deps: [e.project_id],
      secondsToRefetch: 15 * 60,
    },
  );
  const { commitStatus: status } = useCommitStatus(e.project_id, commit);
  const webAction = (): React.ReactNode | undefined => {
    if (project) {
      const proUrl = project.web_url;
      if (proUrl && commit) {
        const url = urljoin(proUrl, `-/commit/${commit}`);
        return <GitLabOpenInBrowserAction url={url} />;
      }
    }
    return undefined;
  };

  const action = (): React.ReactNode | undefined | null => {
    if (project && commit && status?.status) {
      return (
        <Action.Push
          title="Open Pipeline"
          icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
          target={<PipelineJobsListByCommit project={project} sha={commit} />}
        />
      );
    }
    return null;
  };

  const statusIcon: Image.ImageLike | undefined = status?.status
    ? getCIJobStatusIcon(status.status, status.allow_failure)
    : undefined;
  const icon: Image.ImageLike | undefined = statusIcon
    ? statusIcon
    : { source: GitLabIcons.commit, tintColor: Color.Green };

  return (
    <List.Item
      title={title}
      subtitle={ref || commit}
      accessories={[{ text: project?.name_with_namespace }]}
      icon={{ value: icon, tooltip: status?.status ? `Status: ${capitalizeFirstLetter(status.status)}` : "" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {action()}
            {webAction()}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RecentCommitsListEmptyView() {
  return <List.EmptyView title="No Commits" icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }} />;
}

export function RecentCommitsList() {
  const [project, setProject] = useState<Project>();
  const { data, error, isLoading } = useCache<Event[]>(
    "events_pushed",
    async (): Promise<Event[]> => {
      const events: Event[] = await gitlab.fetch("events", { action: "pushed" }).then((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return d.map((ev: any) => ev as Event);
      });
      const result = events.filter((e) => e.action_name === "pushed to" || e.action_name === "pushed new");
      return result;
    },
    {
      deps: [],
      secondsToRefetch: 5,
    },
  );
  if (error) {
    showErrorToast(error, "Could not fetch Events");
  }
  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }
  const commits = project ? data?.filter((e) => e.project_id === project.id) : data;

  return (
    <List isLoading={isLoading} searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}>
      {commits?.map((e) => (
        <EventCommitListItem event={e} key={`${e.id}`} />
      ))}
      <RecentCommitsListEmptyView />
    </List>
  );
}

export interface CommitStatus {
  status: string;
  author: User;
  ref?: string;
  allow_failure: boolean;
}

export interface Commit {
  id: string;
  short_id: string;
  title: string;
  created_at: string;
  message: string;
  committer_name: string;
  author_name: string;
  committed_date: string;
  web_url: string;
}

async function getProjectCommits(projectID: number, refName?: string): Promise<Commit[] | undefined> {
  let args: Record<string, string> | undefined;
  if (refName) {
    args = {
      ref_name: refName,
    };
  }
  const commits: Commit[] = await gitlab.fetch(`projects/${projectID}/repository/commits`, args).then((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return d.map((data: any) => data as Commit);
  });
  return commits;
}

export function ProjectCommitList(props: { projectID: number; refName?: string; navigationTitle?: string }) {
  const projectID = props.projectID;
  const refName = props.refName;
  let cacheKey = `project_commits_${projectID}`;
  if (refName) {
    cacheKey += `_${refName}`;
  }
  const { data, error, isLoading } = useCache<Commit[] | undefined>(
    cacheKey,
    async (): Promise<Commit[] | undefined> => {
      return await getProjectCommits(projectID, refName);
    },
    {
      deps: [projectID, refName],
      secondsToRefetch: 60,
    },
  );
  if (error) {
    showErrorToast(error, "Could not fetch commits from Project");
  }
  return (
    <List isLoading={isLoading} navigationTitle={props.navigationTitle}>
      {data?.map((e) => (
        <CommitListItem key={e.id} commit={e} projectID={projectID} />
      ))}
    </List>
  );
}
