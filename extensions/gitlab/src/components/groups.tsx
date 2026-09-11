import { ActionPanel, Color, Action, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getGitLabGQL, gitlab } from "../common";
import { dataToProject, Group, Milestone, Project } from "../gitlabapi";
import { getTextIcon, GitLabIcons } from "../icons";
import { getFirstChar, getPreferences } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { EpicList } from "./epics";
import { IssueList, IssueScope, IssueState } from "./issues";
import { MilestoneList } from "./milestones";
import { MRList, MRScope, MRState } from "./mr";
import { ProjectListItem } from "./project";

function webUrl(group: Group, partial: string) {
  return getGitLabGQL().urlJoin(`groups/${group.full_path}/${partial}`);
}

export function GroupListItem(props: { group: Group; nameOnly?: boolean }) {
  return (
    <List.Item
      id={`${props.group.id}`}
      title={props.nameOnly === true ? props.group.name : props.group.full_name}
      icon={
        props.group.avatar_url || props.group.owner?.avatar_url
          ? { source: props.group.avatar_url ?? props.group.owner?.avatar_url ?? "" }
          : getTextIcon((props.group.name ? getFirstChar(props.group.name) : "?").toUpperCase())
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Group"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<GroupList parentGroup={props.group} />}
              icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={props.group.web_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Group ID" content={props.group.id} />
            <Action.CopyToClipboard title="Copy Group URL" content={props.group.web_url} />
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
              target={<IssueList group={props.group} scope={IssueScope.all} state={IssueState.opened} />}
            />
            <Action.Push
              title="Merge Requests"
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
              target={<MRList group={props.group} scope={MRScope.all} state={MRState.opened} />}
            />
            <Action.Push
              title="Milestones"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
              target={<MilestoneList group={props.group} />}
            />
            <GitLabOpenInBrowserAction
              title="Wiki"
              icon={{ source: GitLabIcons.wiki, tintColor: Color.PrimaryText }}
              url={webUrl(props.group, "-/wikis")}
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

export function GroupListEmptyView() {
  return <List.EmptyView title="No Groups or Projects" icon={{ source: "group.svg", tintColor: Color.PrimaryText }} />;
}

export function GroupList(props: { parentGroup?: Group }) {
  const topLevelOnly = !getPreferences().flatlist;
  const { groupsinfo, isLoading } = useMyGroups({
    parentGroupID: props.parentGroup ? props.parentGroup.id : 0,
    top_level_only: topLevelOnly,
  });

  return (
    <List
      searchBarPlaceholder="Filter Groups by Name..."
      isLoading={isLoading}
      navigationTitle={props.parentGroup ? `Group ${props.parentGroup.full_path}` : undefined}
    >
      <List.Section title="Groups">
        {groupsinfo.groups.map((group) => (
          <GroupListItem key={group.id} group={group} nameOnly={topLevelOnly} />
        ))}
      </List.Section>
      <List.Section title="Projects">
        {groupsinfo.projects.map((project) => (
          <ProjectListItem key={project.id} project={project} nameOnly={topLevelOnly} />
        ))}
      </List.Section>
      <GroupListEmptyView />
    </List>
  );
}

const emptyGroupInfo: GroupInfo = { groups: [], projects: [] };

export function useMyGroups(args?: { query?: string; parentGroupID?: number; top_level_only?: boolean }): {
  groupsinfo: GroupInfo;
  hasError?: boolean;
  isLoading: boolean | undefined;
} {
  const topLevelOnly = args?.top_level_only === true;
  const { data, isLoading, error } = useCachedPromise(
    async (parentID: number | undefined, topLevelOnly: boolean): Promise<GroupInfo> => {
      const params: Record<string, string> = { min_access_level: "10" };
      if ((parentID === undefined || parentID <= 0) && topLevelOnly) {
        params.top_level_only = "true";
      }
      const groups =
        ((await gitlab.fetch(
          `groups${parentID && parentID > 0 ? `/${parentID}/subgroups` : ""}`,
          params,
          true,
        )) as Group[]) || [];

      return {
        groups,
        projects:
          parentID && parentID > 0
            ? (
                ((await gitlab.fetch(`groups/${parentID}/projects`, {
                  search: args?.query || "",
                  min_access_level: "30",
                })) || []) as Parameters<typeof dataToProject>[0][]
              ).map((raw) => dataToProject(raw))
            : [],
      };
    },
    [args?.parentGroupID, topLevelOnly],
    { initialData: emptyGroupInfo },
  );
  return { groupsinfo: data, isLoading, hasError: error !== undefined };
}

export interface GroupInfo {
  milestones?: Milestone[];
  groups: Group[];
  projects: Project[];
}
