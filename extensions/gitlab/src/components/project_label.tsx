import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  PushAction,
  Color,
} from "@raycast/api";
import { useState } from "react";
import { gitlab, gitlabgql } from "../common";
import { Label, Project, searchData } from "../gitlabapi";
import { projectIconUrl } from "../utils";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { IssueList, IssueScope } from "./issues";
import { CloneProjectInGitPod, CloneProjectInVSCodeAction } from "./project_actions";
import { GitLabIcons, useImage } from "../icons";
import { useCache } from "../cache";
import { ClearLocalCacheAction } from "./cache_actions";
import { LabelList } from "./label";

function webUrl(project: Project, partial: string) {
  return gitlabgql.urlJoin(`${project.fullPath}/${partial}`);
}

export function ProjectListItem(props: { project: Project }) {
  const project = props.project;
  const {
    localFilepath: localImageFilepath,
    error,
    isLoading,
  } = useImage(projectIconUrl(project), GitLabIcons.project);

  return (
    <List.Item
      id={project.id.toString()}
      title={project.name_with_namespace}
      subtitle={"Stars " + project.star_count}
      icon={localImageFilepath}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={project.web_url} />
          <CopyToClipboardAction title="Copy Project ID" content={project.id} />
          <PushAction
            title="Issues"
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
            target={<IssueList scope={IssueScope.all} project={project} />}
          />
          <PushAction
            title="Merge Requests"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
            target={<MRList scope={MRScope.all} project={project} />}
          />
          <PushAction
            title="Branches"
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
            target={<BranchList project={project} />}
          />
          <PushAction
            title="Pipelines"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
            target={<PipelineList projectFullPath={project.fullPath} />}
          />
          <PushAction
            title="Milestones"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
            target={<MilestoneList project={project} />}
          />
          <OpenInBrowserAction
            title="Labels"
            icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            url={webUrl(props.project, "-/labels")}
          />
          <OpenInBrowserAction
            title="Security & Compliance"
            icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
            url={webUrl(props.project, "-/security/discover")}
          />
          <OpenInBrowserAction
            title="Settings"
            icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
            url={webUrl(props.project, "edit")}
          />
          <CloneProjectInVSCodeAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} project={project} />
          <CloneProjectInGitPod shortcut={{ modifiers: ["cmd", "shift"], key: "g" }} project={project} />
          <ClearLocalCacheAction />
        </ActionPanel>
      }
    />
  );
}

export function ProjectLabelList(props: { project: Project }) {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Label[]>(
    `project_${props.project.id}_labels`,
    async () => {
      return gitlab.getProjectLabels(props.project.id);
    },
    {
      deps: [searchText, props.project],
      onFilter: async (labels) => {
        return await searchData<Label[]>(labels, {
          search: searchText || "",
          keys: ["name"],
          limit: 50,
        });
      },
    }
  );

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Project labels", error);
  }

  if (!data) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return <LabelList labels={data} onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true} />;
}
