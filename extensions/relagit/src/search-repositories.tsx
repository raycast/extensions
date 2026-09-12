import { Action, ActionPanel, List, Icon, open, getPreferenceValues, Color, showToast, Toast } from "@raycast/api";

import { useRepositories, setSetting, useSettings } from "./settings";
import { editors, bundleIds } from "./shared";
import { git, gitPath } from "./git";
import { checkRelaInstallation } from "./app";

export default () => {
  const preferences = getPreferenceValues();

  const repositories = useRepositories();
  const settings = useSettings();

  checkRelaInstallation();

  if (!gitPath) {
    showToast({
      title: "Git not found",
      message: "Please install Git on your system to use git actions in this command",
      style: Toast.Style.Failure,
    });
  }

  return (
    <List isLoading={repositories === undefined}>
      {repositories?.map((repository) => (
        <List.Item
          key={repository.path}
          title={repository.name}
          subtitle={repository.safePath}
          accessories={
            [
              repository.ahead && {
                icon: Icon.ArrowUp,
                tag: `${repository.ahead}`,
                tooltip: `${repository.ahead} commit${repository.ahead > 1 ? "s" : ""} ahead of remote`,
              },
              repository.behind && {
                icon: Icon.ArrowDown,
                tag: `${repository.behind}`,
                tooltip: `${repository.behind} commit${repository.behind > 1 ? "s" : ""} behind remote`,
              },
              settings.activeRepository === repository.path && {
                icon: Icon.Checkmark,
                tag: { value: "Active", color: Color.Blue },
              },
            ].filter(Boolean) as List.Item.Accessory[]
          }
          actions={
            <ActionPanel title="Actions">
              <Action
                title="Open in RelaGit"
                icon={Icon.CodeBlock}
                onAction={async () => {
                  await setSetting("activeRepository", repository.path);

                  await open(repository.path, bundleIds.relagit);
                }}
              />
              <Action
                title={`Open in ${preferences.application?.name || editors[settings.externalEditor || "code"]}`}
                icon={Icon.Code}
                onAction={async () => {
                  const bundles = preferences.application?.bundleId || bundleIds[settings.externalEditor || "code"];

                  if (Array.isArray(bundles)) {
                    for (const bundle of bundles) {
                      try {
                        await open(repository.path, bundle);
                        break;
                      } catch {
                        // noop, try next bundle
                      }

                      return;
                    }
                  }

                  await open(repository.path, bundles as string);
                }}
              />
              <Action.ShowInFinder path={repository.path} />
              {repository.remote ? <Action.OpenInBrowser title="Open Remote" url={repository.remote} /> : null}
              {repository.ahead ? (
                <Action
                  title={`Push ${repository.ahead} Commit${repository.ahead > 1 ? "s" : ""} to Remote`}
                  icon={Icon.ArrowUp}
                  onAction={async () => {
                    const toast = await showToast({
                      title: "Pushing changes",
                      style: Toast.Style.Animated,
                    });

                    try {
                      await git("push", [], repository.path);

                      toast.style = Toast.Style.Success;
                      toast.title = "Push complete";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Push failed";

                      if (error instanceof Error) {
                        toast.message = error.message;
                      }
                    }
                  }}
                />
              ) : null}
              {repository.behind ? (
                <Action
                  title={`Pull ${repository.behind} Commit${repository.behind > 1 ? "s" : ""} From Remote`}
                  icon={Icon.ArrowDown}
                  onAction={async () => {
                    const toast = await showToast({
                      title: "Pulling changes",
                      style: Toast.Style.Animated,
                    });

                    try {
                      await git("pull", [], repository.path);

                      toast.style = Toast.Style.Success;
                      toast.title = "Pull complete";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Pull failed";

                      if (error instanceof Error) {
                        toast.message = error.message;
                      }
                    }
                  }}
                />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
