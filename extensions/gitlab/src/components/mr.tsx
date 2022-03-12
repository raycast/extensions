import {
  ActionPanel,
  List,
  showToast,
  ToastStyle,
  Color,
  Detail,
  PushAction,
  ImageMask,
  ImageLike,
  CopyToClipboardAction,
} from "@raycast/api";
import { Group, MergeRequest, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab, gitlabgql } from "../common";
import { useState, useEffect } from "react";
import {
  capitalizeFirstLetter,
  getErrorMessage,
  now,
  optimizeMarkdownText,
  Query,
  toDateString,
  tokenizeQueryText,
} from "../utils";
import { gql } from "@apollo/client";
import { MRItemActions } from "./mr_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { getCIJobStatusIcon } from "./jobs";
import { useCommitStatus } from "./commits/utils";

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
  query GetMRDetail($id: ID!) {
    mergeRequest(id: $id) {
      description
      project {
        webUrl
      }
    }
  }
`;

function NoMRListItem(props: {
  isLoading: boolean | undefined;
  mrs: MergeRequest[] | undefined;
  selectProjectAction: JSX.Element | undefined;
}): JSX.Element | null {
  const mrs = props.mrs;
  const selectProjectAction = props.selectProjectAction;
  if (props.isLoading) {
    return null;
  }
  if (mrs && mrs.length <= 0) {
    if (selectProjectAction !== undefined) {
      return <List.Item title="No Merge Requests found" actions={<ActionPanel>{selectProjectAction}</ActionPanel>} />;
    }
  }
  return null;
}

export function MRDetailFetch(props: { project: Project; mrId: number }): JSX.Element {
  const { mr, isLoading, error } = useMR(props.project.id, props.mrId);
  if (error) {
    showToast(ToastStyle.Failure, "Could not fetch Merge Request Details", error);
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

export function MRDetail(props: { mr: MergeRequest }): JSX.Element {
  const mr = props.mr;
  const { mrdetail, error, isLoading } = useDetail(props.mr.id);
  if (error) {
    showToast(ToastStyle.Failure, "Could not get merge request details", error);
  }

  const desc = (mrdetail?.description ? mrdetail.description : props.mr.description) || "";

  const lines: string[] = [];
  if (mr) {
    lines.push(`# ${mr.title}`);
    lines.push(`Merge \`${mr.source_branch}\` into \`${mr.target_branch}\``);
    if (mr.author) {
      lines.push(`Author: ${mr.author.name} [@${mr.author.username}](${mr.author.web_url})`);
    }
    lines.push(`Status: \`${capitalizeFirstLetter(mr.state)}\``);
    const labels = mr.labels.map((i) => `\`${i.name || i}\``).join(" ");
    lines.push(`Labels: ${labels || "<No Label>"}`);
    lines.push("## Description\n" + optimizeMarkdownText(desc, mrdetail?.projectWebUrl));
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
          <CopyToClipboardAction title="Copy Merge Request Description" content={props.mr.description} />
        </ActionPanel>
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        const data = await gitlabgql.client.query({
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
  selectProjectAction?: JSX.Element;
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
  selectProjectAction = undefined,
}: MRListProps): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { mrs, error, isLoading, refresh } = useSearch(searchText, scope, state, project, group);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Merge Requests", error);
  }

  if (!mrs) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const title = scope == MRScope.assigned_to_me ? "Your Merge Requests" : "Created Recently";

  return (
    <List
      searchBarPlaceholder="Filter Merge Requests by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={navTitle(project, group)}
    >
      <List.Section title={title} subtitle={mrs?.length.toString() || "0"}>
        {mrs?.map((mr) => (
          <MRListItem
            key={mr.id}
            mr={mr}
            refreshData={refresh}
            action={selectProjectAction}
            showCIStatus={scope === MRScope.assigned_to_me}
          />
        ))}
      </List.Section>
      <List.Section>
        <NoMRListItem isLoading={isLoading} mrs={mrs} selectProjectAction={selectProjectAction} />
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

  const getIcon = (): ImageLike => {
    if (mr.state === "merged") {
      return { source: GitLabIcons.merged, tintColor: Color.Purple, mask: ImageMask.Circle };
    } else if (mr.state === "closed") {
      return { source: GitLabIcons.mropen, tintColor: Color.Red, mask: ImageMask.Circle };
    } else {
      return { source: GitLabIcons.mropen, tintColor: Color.Green, mask: ImageMask.Circle };
    }
  };
  const icon = getIcon();
  let accessoryIcon: ImageLike | undefined = { source: mr.author?.avatar_url || "", mask: ImageMask.Circle };
  if (props.showCIStatus) {
    const { commitStatus: status } = useCommitStatus(mr.project_id, mr.sha);
    if (status) {
      accessoryIcon = getCIJobStatusIcon(status.status);
    }
  }
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={"#" + mr.iid}
      icon={icon}
      accessoryIcon={accessoryIcon}
      accessoryTitle={toDateString(mr.updated_at)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction
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
  mrs?: MergeRequest[];
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [mrs, setMRs] = useState<MergeRequest[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
