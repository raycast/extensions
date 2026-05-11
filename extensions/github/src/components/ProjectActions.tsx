import { Action, ActionPanel, Icon, Toast, confirmAlert, openExtensionPreferences, showToast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ProjectFieldsFragment } from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";
import { hasRequiredScopes } from "../helpers/scopes";
import { useMyProjects } from "../hooks/useMyProjects";

type ProjectActionsProps = {
  project: ProjectFieldsFragment;
  mutateList?: MutatePromise<ProjectFieldsFragment[] | undefined> | ReturnType<typeof useMyProjects>["mutate"];
  mutateDetail?: MutatePromise<ProjectFieldsFragment>;
  children?: React.ReactNode;
};

export default function ProjectActions({ project, children, mutateList, mutateDetail }: ProjectActionsProps) {
  const { github, octokit } = getGitHubClient();

  const canClientActions = project.viewerCanClose || project.viewerCanReopen || project.viewerCanUpdate;

  async function mutate() {
    if (mutateList) {
      await mutateList();
    }

    if (mutateDetail) {
      await mutateDetail();
    }
  }

  async function setProjectClosed(state: boolean) {
    try {
      await showToast({ style: Toast.Style.Animated, title: state ? `Closing project` : `Reopening project` });
      const hasProjectScopes = await hasRequiredScopes(["project", "project:write"], octokit);

      if (!hasProjectScopes) {
        const toastOptions: Toast.Options = {
          style: Toast.Style.Failure,
          title: `Missing Scopes`,
          message: `You need the "project" or "project:write" scopes to close or reopen a project. Please re-authenticate.`,
          primaryAction: {
            title: "Re-authenticate",
            onAction: (toast) => {
              openExtensionPreferences();
              toast.hide();
            },
          },
        };

        await showToast(toastOptions);
        return;
      }

      await github.changeProjectStatus({
        projectId: project.id,
        closed: state,
      });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Project "${project.title}" is now ${state ? "closed" : "reopened"}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed ${state ? "closing" : "reopening"} project`,
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel title={`Project: ${project.title}`}>
      {children}

      <Action.OpenInBrowser title="Open in GitHub" icon={Icon.Globe} url={project.url} />

      {canClientActions ? (
        <ActionPanel.Section>
          {project.viewerCanClose && project.viewerCanUpdate && !project.closed ? (
            <Action
              title="Close Project"
              icon={Icon.Lock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Close Project",
                    message: "Are you sure you want to close this project?",
                  })
                ) {
                  await setProjectClosed(true);
                }
              }}
            />
          ) : null}
          {project.viewerCanReopen && project.viewerCanUpdate && project.closed ? (
            <Action
              title="Reopen Project"
              icon={Icon.LockUnlocked}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Reopen Project",
                    message: "Are you sure you want to reopen this project?",
                  })
                ) {
                  await setProjectClosed(false);
                }
              }}
            />
          ) : null}
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
