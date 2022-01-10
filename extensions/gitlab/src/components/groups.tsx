import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  ImageLike,
  ImageMask,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab, gitlabgql } from "../common";
import { dataToProject, Group, Project } from "../gitlabapi";
import { GitLabIcons, useImage } from "../icons";
import { EpicList } from "./epics";
import { IssueList, IssueScope, IssueState } from "./issues";
import { MilestoneList } from "./milestones";
import { MRList, MRScope, MRState } from "./mr";
import { ProjectListItem } from "./project";

function groupIconUrl(group: any): string | undefined {
  let result: string | undefined;
  // TODO check also namespace for icon
  if (group.avatar_url) {
    result = group.avatar_url;
  } else if (group.owner && group.owner.avatar_url) {
    result = group.owner.avatar_url;
  }
  return result;
}

function groupIcon(group: any): ImageLike {
  let result: string = GitLabIcons.project;
  // TODO check also namespace for icon
  if (group.avatar_url) {
    result = group.avatar_url;
  } else if (group.owner && group.owner.avatar_url) {
    result = group.owner.avatar_url;
  }
  return { source: result, mask: ImageMask.Circle };
}

function webUrl(group: Group, partial: string) {
  return gitlabgql.urlJoin(`groups/${group.full_path}/${partial}`);
}

export function GroupListItem(props: { group: any }) {
  const group = props.group;
  const { localFilepath: localImageFilepath, error, isLoading } = useImage(groupIconUrl(group), GitLabIcons.project);
  return (
    <List.Item
      id={`${group.id}`}
      title={group.full_name}
      icon={localImageFilepath}
      actions={
        <ActionPanel>
          <PushAction
            title="Open Group"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<GroupList parentGroup={props.group} />}
          />
          <OpenInBrowserAction url={group.web_url} />
          <CopyToClipboardAction title="Copy Group ID" content={group.id} />
          <PushAction
            title="Epics"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            icon={{ source: GitLabIcons.epic, tintColor: Color.PrimaryText }}
            target={<EpicList group={props.group} />}
          />
          <PushAction
            title="Issues"
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
            target={<IssueList group={group} scope={IssueScope.all} state={IssueState.opened} />}
          />
          <PushAction
            title="Merge Requests"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
            target={<MRList group={group} scope={MRScope.all} state={MRState.opened} />}
          />
          <PushAction
            title="Milestones"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
            target={<MilestoneList group={group} />}
          />
          <OpenInBrowserAction
            title="Labels"
            icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
            url={webUrl(props.group, "-/labels")}
          />
          <OpenInBrowserAction
            title="Security & Compliance"
            icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
            url={webUrl(props.group, "-/security/dashboard")}
          />
          <OpenInBrowserAction
            title="Settings"
            icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
            url={webUrl(props.group, "-/edit")}
          />
        </ActionPanel>
      }
    />
  );
}

export function GroupList(props: { parentGroup?: Group }) {
  const parentGroup = props.parentGroup;
  const parentGroupID = parentGroup ? parentGroup.id : 0;
  const [searchText, setSearchText] = useState<string>();
  const { groupsinfo, error, isLoading } = useSearch(searchText, parentGroupID);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Groups", error);
  }

  if (!groupsinfo) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const navtitle = parentGroup ? `Group ${parentGroup.full_path}` : undefined;

  return (
    <List
      searchBarPlaceholder="Filter Groups by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={navtitle}
    >
      {groupsinfo?.groups?.map((group) => (
        <GroupListItem key={group.id} group={group} />
      ))}
      {groupsinfo?.projects?.map((project) => (
        <ProjectListItem project={project} />
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  parentGroupID?: number
): {
  groupsinfo?: GroupInfo;
  error?: string;
  isLoading: boolean;
} {
  const [groupsinfo, setGroupsInfo] = useState<GroupInfo | undefined>(); //{ groups: [], projects: [] });
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
        const subgroupFilter = parentGroupID && parentGroupID > 0 ? `/${parentGroupID}/subgroups` : "";
        const data =
          ((await gitlab.fetch(`groups${subgroupFilter}`, {
            search: query || "",
            min_access_level: "30",
          })) as Group[]) || [];

        let projectsdata: Project[] = [];
        if (parentGroupID && parentGroupID > 0) {
          const projectsdatagl =
            (await gitlab.fetch(`groups/${parentGroupID}/projects`, { search: query || "", min_access_level: "30" })) ||
            [];
          projectsdata = projectsdatagl.map((p: any) => dataToProject(p));
        }
        if (!didUnmount) {
          if (groupsinfo) {
            setGroupsInfo({ ...groupsinfo, groups: data, projects: projectsdata });
          } else {
            setGroupsInfo({ groups: data, projects: projectsdata });
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
  }, [query, parentGroupID]);

  return { groupsinfo, error, isLoading };
}

interface GroupInfo {
  groups: Group[];
  projects: Project[];
}
