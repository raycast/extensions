import { ActionPanel, Color, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCache } from "../cache";
import { getGitLabGQL, gitlab } from "../common";
import { dataToProject, Group, Project } from "../gitlabapi";
import { GitLabIcons, useImage } from "../icons";
import { hashRecord, showErrorToast } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { EpicList } from "./epics";
import { IssueList, IssueScope, IssueState } from "./issues";
import { MilestoneList } from "./milestones";
import { MRList, MRScope, MRState } from "./mr";
import { ProjectListItem } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

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

function webUrl(group: Group, partial: string) {
  return getGitLabGQL().urlJoin(`groups/${group.full_path}/${partial}`);
}

export function GroupListItem(props: { group: any }): JSX.Element {
  const group = props.group;
  const { localFilepath: localImageFilepath } = useImage(groupIconUrl(group), GitLabIcons.project);
  return (
    <List.Item
      id={`${group.id}`}
      title={group.full_name}
      icon={localImageFilepath}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Group"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<GroupList parentGroup={props.group} />}
              icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={group.web_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Group ID" content={group.id} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Epics"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={{ source: GitLabIcons.epic, tintColor: Color.PrimaryText }}
              target={<EpicList group={props.group} />}
            />
            <Action.Push
              title="Issues"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
              target={<IssueList group={group} scope={IssueScope.all} state={IssueState.opened} />}
            />
            <Action.Push
              title="Merge Requests"
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
              target={<MRList group={group} scope={MRScope.all} state={MRState.opened} />}
            />
            <Action.Push
              title="Milestones"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
              target={<MilestoneList group={group} />}
            />
            <GitLabOpenInBrowserAction
              title="Labels"
              icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
              url={webUrl(props.group, "-/labels")}
            />
            <GitLabOpenInBrowserAction
              title="Security & Compliance"
              icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
              url={webUrl(props.group, "-/security/dashboard")}
            />
            <GitLabOpenInBrowserAction
              title="Settings"
              icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
              url={webUrl(props.group, "-/edit")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function GroupList(props: { parentGroup?: Group }): JSX.Element {
  const parentGroup = props.parentGroup;
  const parentGroupID = parentGroup ? parentGroup.id : 0;
  const { groupsinfo, error, isLoading } = useMyGroups(undefined, parentGroupID);

  if (error) {
    showErrorToast(error, "Cannot search Groups");
  }

  if (isLoading === undefined) {
    return <List isLoading={true} />;
  }

  const navtitle = parentGroup ? `Group ${parentGroup.full_path}` : undefined;

  return (
    <List searchBarPlaceholder="Filter Groups by name..." isLoading={isLoading} navigationTitle={navtitle}>
      {groupsinfo?.groups?.map((group) => (
        <GroupListItem key={group.id} group={group} />
      ))}
      {groupsinfo?.projects?.map((project) => (
        <ProjectListItem project={project} />
      ))}
    </List>
  );
}

function useMyGroups(
  query: string | undefined,
  parentGroupID?: number
): {
  groupsinfo?: GroupInfo;
  error?: string;
  isLoading: boolean | undefined;
} {
  const params: Record<string, any> = { min_access_level: "30" };
  const paramsHash = hashRecord(params);
  const [groupsinfo, setGroupsInfo] = useState<GroupInfo | undefined>();
  const { data, isLoading, error } = useCache<GroupInfo | undefined>(
    parentGroupID && parentGroupID > 0 ? `mygroups_${parentGroupID}_${paramsHash}` : `mygroups_${paramsHash}`,
    async () => {
      const subgroupFilter = parentGroupID && parentGroupID > 0 ? `/${parentGroupID}/subgroups` : "";
      const gldata = ((await gitlab.fetch(`groups${subgroupFilter}`, params)) as Group[]) || [];

      let projectsdata: Project[] = [];
      if (parentGroupID && parentGroupID > 0) {
        const projectsdatagl =
          (await gitlab.fetch(`groups/${parentGroupID}/projects`, { search: query || "", min_access_level: "30" })) ||
          [];
        projectsdata = projectsdatagl.map((p: any) => dataToProject(p));
      }
      if (groupsinfo) {
        return { ...groupsinfo, groups: gldata, projects: projectsdata };
      } else {
        return { groups: gldata, projects: projectsdata };
      }
    },
    {
      secondsToInvalid: 900,
      deps: [parentGroupID],
    }
  );
  useEffect(() => {
    setGroupsInfo(data);
  }, [query, data]);
  return { groupsinfo, isLoading, error };
}

interface GroupInfo {
  groups: Group[];
  projects: Project[];
}
