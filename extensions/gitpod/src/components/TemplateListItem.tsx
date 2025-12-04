import { List, ActionPanel, Action, showToast, Toast, open, getPreferenceValues } from "@raycast/api";

import { GitpodIcons } from "../../constants";
import { getGitHubUser } from "../helpers/users";
import { getGitpodEndpoint } from "../preferences/gitpod_endpoint";

type RepositoryListItemProps = {
  repository: {
    name: string;
    url: string;
    id: string;
    stargazerCount: number;
    owner: { name?: string | null; login?: string; avatarUrl: string };
    issues: { totalCount: number };
    pullRequests: { totalCount: number };
  };
};

export default function TemplateListItem({ repository }: RepositoryListItemProps) {
  const owner = getGitHubUser(repository.owner);
  const numberOfStars = repository.stargazerCount;
  const gitpodEndpoint = getGitpodEndpoint();

  const accessories: List.Item.Accessory[] = [];

  const showLaunchToast = async () => {
    try {
      await showToast({
        title: "Launching your workspace",
        style: Toast.Style.Success,
      });
      setTimeout(() => {
        open(`${gitpodEndpoint}/#${repository.url}`);
      }, 1500);
    } catch (error) {
      await showToast({
        title: "Error launching workspace",
        style: Toast.Style.Failure,
      });
    }
  };

  accessories.unshift(
    {
      text: {
        value: repository.issues?.totalCount.toString(),
      },
      icon: GitpodIcons.issues_icon,
    },
    {
      text: {
        value: repository.pullRequests?.totalCount.toString(),
      },
      icon: GitpodIcons.pulls_icon,
    }
  );

  return (
    <List.Item
      icon={owner.icon}
      title={repository.name}
      {...(numberOfStars > 0
        ? {
            subtitle: {
              value: `${numberOfStars}`,
              tooltip: `Number of Stars: ${numberOfStars}`,
            },
          }
        : {})}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Start with Gitpod" onAction={showLaunchToast} />
          <Action
            title="View template in GitHub"
            onAction={() => {
              open(repository.url);
            }}
          />
          <Action
            title="Learn more about Gitpod templates"
            onAction={() => {
              open("https://www.gitpod.io/docs/introduction/getting-started/quickstart");
            }}
          />
          <Action
            title="Add a template"
            onAction={() => {
              open("https://github.com/gitpod-samples/.github/blob/HEAD/CONTRIBUTING.md");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
