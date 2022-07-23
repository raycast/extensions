import { ActionPanel, List, Color, Detail, Action, Image } from "@raycast/api";
import { Group, MergeRequest, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getGitLabGQL, gitlab } from "../common";
import { useState, useEffect } from "react";
import {
  capitalizeFirstLetter,
  daysInSeconds,
  ensureCleanAccessories,
  getErrorMessage,
  now,
  optimizeMarkdownText,
  Query,
  showErrorToast,
  toDateString,
  tokenizeQueryText,
} from "../utils";
import { gql } from "@apollo/client";
import { MRItemActions } from "./mr_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { getCIJobStatusEmoji } from "./jobs";
import { useCache } from "../cache";
import { userIcon } from "./users";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

export enum MRScope {
  created_by_me = "created_by_me",
  assigned_to_me = "assigned_to_me",
  all = "all",
}

export enum MRState {
  opened = "opened",
  closed = "closed",
  locked = "locked",
  merged = "merged",
  all = "all",
}

const GET_MR_DETAIL = gql`
  query GetMRDetail($id: MergeRequestID!) {
    mergeRequest(id: $id) {
      description
      project {
        webUrl
      }
    }
  }
`;

export function MRDetailFetch(props: { project: Project; mrId: number }): JSX.Element {
  const { mr, isLoading, error } = useMR(props.project.id, props.mrId);
  if (error) {
    showErrorToast(error, "Could not fetch Merge Request Details");
  }
  if (isLoading || !mr) {
    return <Detail isLoading={isLoading} />;
  } else {
    return <MRDetail mr={mr} />;
  }
}

interface MRDetailData {
  description: string;
  projectWebUrl: string;
}

function stateColor(state: string): Color.ColorLike {
  switch (state) {
    case "closed": {
      return Color.Red;
    }
    case "merged": {
      return Color.Purple;
    }
    default: {
      return Color.Green;
    }
  }
}

export function MRDetail(props: { mr: MergeRequest }): JSX.Element {
  const mr = props.mr;
  const { mrdetail, error, isLoading } = useDetail(props.mr.id);
  if (error) {
    showErrorToast(error, "Could not get Merge Request Details");
  }

  const desc = (mrdetail?.description ? mrdetail.description : props.mr.description) || "";

  const lines: string[] = [];
  if (mr) {
    lines.push(`# ${mr.title}`);
    lines.push(optimizeMarkdownText(desc, mrdetail?.projectWebUrl));
  }

  const md = lines.join("  \n");

  return (
    <Detail
      markdown={md}
      isLoading={isLoading}
      navigationTitle={`${props.mr.reference_full}`}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={props.mr.web_url} />
          <MRItemActions mr={props.mr} />
          <Action.CopyToClipboard title="Copy Merge Request Description" content={props.mr.description} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={capitalizeFirstLetter(mr.state)} color={stateColor(mr.state)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="From" text={mr.source_branch} />
          <Detail.Metadata.Label title="Into" text={mr.target_branch} />
          {mr.author && (
            <Detail.Metadata.TagList title="Author">
              <Detail.Metadata.TagList.Item text={mr.author.name} icon={userIcon(mr.author)} />
            </Detail.Metadata.TagList>
          )}
          {mr.assignees.length > 0 && (
            <Detail.Metadata.TagList title="Assignee">
              {mr.assignees.map((a) => (
                <Detail.Metadata.TagList.Item key={a.id} text={a.name} icon={userIcon(a)} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {mr.reviewers.length > 0 && (
            <Detail.Metadata.TagList title="Reviewer">
              {mr.reviewers.map((a) => (
                <Detail.Metadata.TagList.Item key={a.id} text={a.name} icon={userIcon(a)} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {mr.milestone && <Detail.Metadata.Label title="Milestone" text={mr.milestone.title} />}
          {mr.labels.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {mr.labels.map((m) => (
                <Detail.Metadata.TagList.Item key={m.id} text={m.name} color={m.color} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function useDetail(issueID: number): {
  mrdetail?: MRDetailData;
  error?: string;
  isLoading: boolean;
} {
  const [mrdetail, setMRDetail] = useState<MRDetailData>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (issueID <= 0 || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const data = await getGitLabGQL().client.query({
          query: GET_MR_DETAIL,
          variables: { id: `gid://gitlab/MergeRequest/${issueID}` },
        });
        const desc = data.data.mergeRequest.description || "<no description>";
        const projectWebUrl = data.data.mergeRequest.project.webUrl;
        if (!didUnmount) {
          setMRDetail({
            projectWebUrl: projectWebUrl,
            description: desc,
          });
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [issueID]);

  return { mrdetail, error, isLoading };
}

interface MRListProps {
  scope: MRScope;
  state?: MRState;
  project?: Project;
  group?: Group;
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}

function navTitle(project?: Project, group?: Group): string | undefined {
  if (group) {
    return `Group MRs ${group.full_path}`;
  }
  if (project) {
    return `MRs ${project.fullPath}`;
  }
  return undefined;
}

export function MRList({
  scope = MRScope.created_by_me,
  state = MRState.all,
  project = undefined,
  group = undefined,
  searchBarAccessory = undefined,
}: MRListProps): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { mrs, error, isLoading, refresh } = useSearch(searchText, scope, state, project, group);

  if (error) {
    showErrorToast(error, "Cannot search Merge Requests");
  }

  const title = scope == MRScope.assigned_to_me ? "Your Merge Requests" : "Created Recently";

  return (
    <List
      searchBarPlaceholder="Filter Merge Requests by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={searchBarAccessory}
      navigationTitle={navTitle(project, group)}
    >
      <List.Section title={title} subtitle={mrs.length.toString() || "0"}>
        {mrs.map((mr) => (
          <MRListItem key={mr.id} mr={mr} refreshData={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

export function MRListItem(props: {
  mr: MergeRequest;
  refreshData: () => void;
  action?: JSX.Element;
  showCIStatus?: boolean;
}): JSX.Element {
  const mr = props.mr;

  const getIcon = (): Image.ImageLike => {
    if (mr.state === "merged") {
      return { source: GitLabIcons.merged, tintColor: Color.Purple, mask: Image.Mask.Circle };
    } else if (mr.state === "closed") {
      return { source: GitLabIcons.mropen, tintColor: Color.Red, mask: Image.Mask.Circle };
    } else {
      return { source: GitLabIcons.mropen, tintColor: Color.Green, mask: Image.Mask.Circle };
    }
  };
  const icon = getIcon();
  const accessoryIcon: Image.ImageLike | undefined = { source: mr.author?.avatar_url || "", mask: Image.Mask.Circle };
  let cistatusEmoji: string | undefined;
  if (props.showCIStatus === undefined || props.showCIStatus === true) {
    const { mrpipelines } = useMRPipelines(mr);
    if (mrpipelines && mrpipelines.length > 0) {
      cistatusEmoji = getCIJobStatusEmoji(mrpipelines[0].status);
    }
  }
  const subtitle: string[] = [`!${mr.iid}`];
  if (cistatusEmoji) {
    subtitle.push(cistatusEmoji);
  }
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={subtitle.join("    ")}
      icon={icon}
      accessories={ensureCleanAccessories([
        { text: mr.milestone?.title },
        { text: toDateString(mr.updated_at) },
        { icon: accessoryIcon },
      ])}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              target={<MRDetail mr={mr} />}
              icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={mr.web_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MRItemActions mr={mr} onDataChange={props.refreshData} />
          </ActionPanel.Section>
          <ActionPanel.Section>{props.action ?? props.action}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getIssueQuery(query: string | undefined) {
  return tokenizeQueryText(query, ["label", "author", "milestone", "assignee", "draft", "target-branch", "reviewer"]);
}

function injectQueryNamedParameters(
  requestParams: Record<string, any>,
  query: Query,
  scope: MRScope,
  isNegative: boolean
) {
  const namedParams = isNegative ? query.negativeNamed : query.named;
  for (const extraParam of Object.keys(namedParams)) {
    const extraParamVal = namedParams[extraParam];
    const prefixed = (text: string): string => {
      return isNegative ? `not[${text}]` : text;
    };
    if (extraParamVal) {
      switch (extraParam) {
        case "label":
          {
            requestParams[prefixed("labels")] = extraParamVal.join(",");
          }
          break;
        case "author":
          {
            if (scope === MRScope.all) {
              requestParams[prefixed("author_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "milestone":
          {
            requestParams[prefixed("milestone")] = extraParamVal.join(",");
          }
          break;
        case "assignee":
          {
            if (scope === MRScope.all) {
              requestParams[prefixed("assignee_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "draft":
          {
            requestParams[prefixed("wip")] = extraParamVal.join(",").toLocaleLowerCase();
          }
          break;
        case "target-branch":
          {
            requestParams[prefixed("target_branch")] = extraParamVal.join(",");
          }
          break;
        case "reviewer":
          {
            requestParams[prefixed("reviewer_username")] = extraParamVal.join(",");
          }
          break;
      }
    }
  }
}

export function useSearch(
  query: string | undefined,
  scope: MRScope,
  state: MRState,
  project?: Project,
  group?: Group
): {
  mrs: MergeRequest[];
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [mrs, setMRs] = useState<MergeRequest[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timestamp, setTimestamp] = useState<Date>(now());

  const refresh = () => {
    setTimestamp(now());
  };

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const qd = getIssueQuery(query);
        query = qd.query;
        const params: Record<string, any> = {
          state: state,
          scope: scope,
          search: query || "",
          in: "title",
        };
        injectQueryNamedParameters(params, qd, scope, false);
        injectQueryNamedParameters(params, qd, scope, true);
        if (group) {
          const glMRs = await gitlab.getGroupMergeRequests(params, group);
          if (!didUnmount) {
            setMRs(glMRs);
          }
        } else {
          const glMRs = await gitlab.getMergeRequests(params, project);
          if (!didUnmount) {
            setMRs(glMRs);
          }
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, project, timestamp]);

  return { mrs, error, isLoading, refresh };
}

export function useMR(
  projectID: number,
  mrID: number
): {
  mr?: MergeRequest;
  error?: string;
  isLoading: boolean;
} {
  const [mr, setMR] = useState<MergeRequest>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glMr = await gitlab.getMergeRequest(projectID, mrID, {});
        if (!didUnmount) {
          setMR(glMr);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [projectID, mrID]);

  return { mr, error, isLoading };
}

interface MRPipeline {
  id: number;
  sha: string;
  ref: string;
  status: string;
}

export function useMRPipelines(mr: MergeRequest): {
  mrpipelines: MRPipeline[] | undefined;
  isLoading: boolean | undefined;
  error: string | undefined;
  performRefetch: () => void;
} {
  const {
    data: mrpipelines,
    isLoading,
    error,
    performRefetch,
  } = useCache<MRPipeline[] | undefined>(
    `mrpipelines_${mr.project_id}_${mr.iid}`,
    async (): Promise<MRPipeline[] | undefined> => {
      const result: MRPipeline[] | undefined = await gitlab
        .fetch(`projects/${mr.project_id}/merge_requests/${mr.iid}/pipelines`)
        .then((data) => {
          return data?.map((m: any) => {
            return m as MRPipeline;
          });
        });
      return result;
    },
    {
      deps: [mr],
      secondsToRefetch: 10,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  return { mrpipelines, isLoading, error, performRefetch };
}
