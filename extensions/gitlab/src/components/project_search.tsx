import { ActionPanel, CopyToClipboardAction, List, showToast, ToastStyle, PushAction, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab, gitlabgql } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage, projectIcon } from "../utils";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { ProjectNavMenusList } from "./project_nav";
import { IssueList, IssueScope } from "./issues";
import { CloneProjectInGitPod, CloneProjectInVSCodeAction, ShowProjectLabels } from "./project_actions";
import { GitLabIcons } from "../icons";
import { ClearLocalCacheAction } from "./cache_actions";
import { GitLabOpenInBrowserAction } from "./actions";

function webUrl(project: Project, partial: string) {
  return gitlabgql.urlJoin(`${project.fullPath}/${partial}`);
}

export function ProjectListItem(props: { project: Project }): JSX.Element {
  const project = props.project;
  return (
    <List.Item
      id={project.id.toString()}
      title={project.name_with_namespace}
      subtitle={"Stars " + project.star_count}
      icon={projectIcon(project)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={project.name_with_namespace}>
            <GitLabOpenInBrowserAction url={project.web_url} />
            <PushAction
              title="Explore"
              icon={{ source: GitLabIcons.explorer, tintColor: Color.PrimaryText }}
              target={<ProjectNavMenusList project={project} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Project ID" content={project.id} />
          </ActionPanel.Section>
          <ActionPanel.Section>
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
            <ShowProjectLabels project={props.project} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            <GitLabOpenInBrowserAction
              title="Labels"
              icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "-/labels")}
            />
            <GitLabOpenInBrowserAction
              title="Security & Compliance"
              icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "-/security/discover")}
            />
            <GitLabOpenInBrowserAction
              title="Settings"
              icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "edit")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="IDE">
            <CloneProjectInVSCodeAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} project={project} />
            <CloneProjectInGitPod shortcut={{ modifiers: ["cmd", "shift"], key: "g" }} project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Cache">
            <ClearLocalCacheAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function ProjectSearchList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { projects, error, isLoading } = useSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Project", error);
  }

  if (!projects) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Projects by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {projects?.map((project) => (
        <ProjectListItem key={project.id} project={project} />
      ))}
    </List>
  );
}

export function useSearch(query: string | undefined): {
  projects?: Project[];
  error?: string;
  isLoading: boolean;
} {
  const [projects, setProjects] = useState<Project[]>();
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
        const glProjects = await gitlab.getProjects({ searchText: query || "", searchIn: "title" });

        if (!didUnmount) {
          setProjects(glProjects);
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
  }, [query]);

  return { projects, error, isLoading };
}
