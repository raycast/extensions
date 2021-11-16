import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Image,
  Color,
  Detail,
  PushAction,
  ImageMask,
} from "@raycast/api";
import { Group, MergeRequest, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab, gitlabgql } from "../common";
import { useState, useEffect } from "react";
import { optimizeMarkdownText, Query, toDateString, tokenizeQueryText } from "../utils";
import { gql } from "@apollo/client";
import { MRItemActions } from "./mr_actions";

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
    }
  }
`;

export function MRDetail(props: { mr: MergeRequest }) {
  const { description, error, isLoading } = useDetail(props.mr.id);
  if (error) {
    showToast(ToastStyle.Failure, "Could not get merge request details", error);
  }

  const desc = (description ? description : props.mr.description) || "";

  let md = "";
  if (props.mr) {
    md = props.mr.labels.map((i) => `\`${i.name}\``).join(" ") + "  \n";
  }
  md += "## Description\n" + optimizeMarkdownText(desc);

  return (
    <Detail
      markdown={md}
      isLoading={isLoading}
      navigationTitle={`${props.mr.reference_full}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={props.mr.web_url} />
          <MRItemActions mr={props.mr} />
        </ActionPanel>
      }
    />
  );
}

export function useDetail(issueID: number): {
  description?: string;
  error?: string;
  isLoading: boolean;
} {
  const [description, setDescription] = useState<string>();
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
        if (!didUnmount) {
          setDescription(desc);
        }
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
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

  return { description, error, isLoading };
}

interface MRListProps {
  scope: MRScope;
  state?: MRState;
  project?: Project;
  group?: Group;
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
}: MRListProps) {
  const [searchText, setSearchText] = useState<string>();
  const { mrs, error, isLoading } = useSearch(searchText, scope, state, project, group);

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
          <MRListItem key={mr.id} mr={mr} />
        ))}
      </List.Section>
    </List>
  );
}

export function MRListItem(props: { mr: MergeRequest }) {
  const mr = props.mr;
  const icon: Image =
    mr.state == "merged"
      ? { source: GitLabIcons.merged, tintColor: Color.Purple, mask: ImageMask.Circle }
      : { source: GitLabIcons.mropen, tintColor: Color.Green, mask: ImageMask.Circle };
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={"#" + mr.iid}
      icon={icon}
      accessoryIcon={{ source: mr.author?.avatar_url || "", mask: ImageMask.Circle }}
      accessoryTitle={toDateString(mr.updated_at)}
      actions={
        <ActionPanel>
          <PushAction
            title="Show Details"
            target={<MRDetail mr={mr} />}
            icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
          />
          <OpenInBrowserAction url={mr.web_url} />
          <MRItemActions mr={mr} />
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
} {
  const [mrs, setMRs] = useState<MergeRequest[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
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
  }, [query, project]);

  return { mrs, error, isLoading };
}
