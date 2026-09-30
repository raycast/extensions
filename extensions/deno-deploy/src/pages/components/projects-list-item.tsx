import { memo, useCallback, useMemo } from "react";

import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";

import type { Project } from "@/api/types";
import { useProjectList } from "@/context/ProjectList";
import { useDashApi } from "@/hooks/useDashApi";
import DebugProject from "@/pages/components/debug-project";
import ProjectDeployments from "@/pages/components/project-deployments";
import ProjectNameChange from "@/pages/form/project-namechange";
import { getTimeSince } from "@/utils/time";
import { showActionToast, showFailureToastWithTimeout } from "@/utils/toast";

const ProjectsListItemF = ({ project: prj }: { project: Project }) => {
  const { push } = useNavigation();
  const { deleteProject, useProject } = useDashApi();
  const { refresh } = useProjectList();

  const { isLoading, data: project } = useProject(prj.id);

  const domainMappings = useMemo(() => {
    if (!project || project === null || !project.hasProductionDeployment) {
      return [];
    }
    return project.productionDeployment.deployment.domainMappings.map((d) => d.domain) ?? [];
  }, [project]);

  const mainDomain = useMemo(() => {
    const findMainDomain = domainMappings.find(
      (domain) => !domain.endsWith(".deno.dev") || domain.includes(`${prj.name}.deno.dev`),
    );
    return findMainDomain ?? (domainMappings.length > 0 ? domainMappings[0] : null);
  }, [domainMappings]);

  const otherDomains = useMemo(() => {
    return domainMappings.filter((domain) => domain !== mainDomain);
  }, [domainMappings, mainDomain]);

  const getPlaygroundMediaType = useCallback((type: "ts" | "js" | "tsx" | "jsx" | "wasm" | "unknown") => {
    switch (type) {
      case "ts":
        return "TypeScript";
      case "js":
        return "JavaScript";
      case "tsx":
        return "TypeScript React";
      case "jsx":
        return "JavaScript React";
      default:
        return type;
    }
  }, []);

  return (
    <List.Item
      key={prj.id}
      title={prj.name}
      icon={
        isLoading || !project
          ? { source: Icon.CircleProgress }
          : project.type === "playground"
            ? `${environment.assetsPath}/playground-logo.svg`
            : `${environment.assetsPath}/git-logo.svg`
      }
      subtitle={`Last update: ${getTimeSince(new Date(prj.updatedAt), Date.now())}`}
      detail={
        ((isLoading || !project) && <List.Item.Detail markdown={`Loading...`} />) || (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={project?.name} />
                <List.Item.Detail.Metadata.Label title="ID" text={project?.id} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  icon={
                    !project || !project.type
                      ? Icon.QuestionMark
                      : project.type === "playground"
                        ? `${environment.assetsPath}/playground-logo.svg`
                        : `${environment.assetsPath}/git-logo.svg`
                  }
                  title="Type"
                  text={project?.type}
                />
                {project && project.type === "playground" && project.playground ? (
                  <List.Item.Detail.Metadata.Label
                    title="Media Type"
                    text={getPlaygroundMediaType(project.playground.mediaType)}
                  />
                ) : null}
                {project && project.type === "git" && project.git && project.git.repository ? (
                  <>
                    <List.Item.Detail.Metadata.Label
                      icon={`${environment.assetsPath}/github-logo.svg`}
                      title="Repository"
                      text={`${project.git.repository.owner}/${project.git.repository.name}`}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Link"
                      text={`https://github.com/${project.git.repository.owner}/${project.git.repository.name}`}
                      target={`https://github.com/${project.git.repository.owner}/${project.git.repository.name}`}
                    />
                  </>
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  icon={Icon.Calendar}
                  title="Created"
                  text={project?.createdAt ? new Date(project.createdAt).toLocaleString() : ""}
                />
                <List.Item.Detail.Metadata.Label
                  icon={Icon.Calendar}
                  title="Updated"
                  text={project?.updatedAt ? new Date(project.updatedAt).toLocaleString() : ""}
                />
                {mainDomain ? (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Main Domain"
                      text={mainDomain}
                      target={`https://${mainDomain}`}
                    />
                  </>
                ) : null}
                {otherDomains.length > 0 ? (
                  <>
                    <List.Item.Detail.Metadata.Label title="Other Domains" />
                    {otherDomains.map((domain) => (
                      <List.Item.Detail.Metadata.Link
                        key={domain}
                        title={""}
                        text={`https://${domain}`}
                        target={`https://${domain}`}
                      />
                    ))}
                    <List.Item.Detail.Metadata.Separator />
                  </>
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
      actions={
        project ? (
          <ActionPanel>
            {project.type === "playground" ? (
              <Action.OpenInBrowser title="Open Playground" url={`https://dash.deno.com/playground/${project.name}`} />
            ) : null}
            <Action.OpenInBrowser title="Open Project Page" url={`https://dash.deno.com/projects/${project.name}`} />
            {mainDomain ? (
              <Action.OpenInBrowser
                title="Open Project Endpoint"
                url={`https://${mainDomain}`}
                shortcut={{ modifiers: project.type === "playground" ? ["cmd", "shift"] : ["cmd"], key: "return" }}
              />
            ) : null}
            <Action
              title="Show Deployments"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => {
                push(<ProjectDeployments project={project} />);
              }}
            />
            <Action
              title="Rename Project"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                push(<ProjectNameChange project={project} refresh={refresh} />);
              }}
            />
            <Action
              title="Delete Project"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Project",
                    message: `Are you sure you want to delete the project "${project.name}"?`,
                    icon: {
                      source: Icon.ExclamationMark,
                      tintColor: "#ff0000",
                    },
                  })
                ) {
                  if (
                    await confirmAlert({
                      title: "Are you really sure?",
                      message: `There is no way back after this... The project "${project.name}" will be deleted.`,
                      icon: {
                        source: Icon.ExclamationMark,
                        tintColor: "#ff0000",
                      },
                    })
                  ) {
                    const abort = showActionToast({ title: `Deleting project "${project.name}`, cancelable: true });
                    try {
                      const res = await deleteProject(project.id, abort.signal);
                      if (res.ok) {
                        showToast(Toast.Style.Success, "Project deleted succesfully");
                      } else {
                        await showFailureToastWithTimeout(
                          "Project deletion failed",
                          new Error("Project deletion failed"),
                        );
                      }
                    } catch (error) {
                      await showFailureToastWithTimeout("Project deletion failed", error as Error);
                    }

                    refresh();
                  }
                }
              }}
            />
            <Action
              title="Show JSON Debug"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => {
                push(<DebugProject project={project} />);
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
};
const ProjectsListItem = memo(ProjectsListItemF);

export default ProjectsListItem;
