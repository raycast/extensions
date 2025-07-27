import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";
import { cloneAndOpen, buildCloneCommand, WEB_IDES } from "../helpers/repository";

import CloneRepositoryForm from "./CloneRepositoryForm";
import { RepositoryDiscussionList } from "./RepositoryDiscussions";
import { RepositoryIssueList } from "./RepositoryIssues";
import { RepositoryPullRequestList } from "./RepositoryPullRequest";
import RepositoryReleases from "./RepositoryReleases";
import { SortAction, SortActionProps, SortTypesDataProps } from "./SortAction";

type RepositoryActionProps = {
  repository: ExtendedRepositoryFieldsFragment;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  mutateList: MutatePromise<ExtendedRepositoryFieldsFragment[] | undefined>;
};

export default function RepositoryActions({
  repository,
  mutateList,
  onVisit,
  setSortQuery,
  sortQuery,
  sortTypesData,
}: RepositoryActionProps & SortActionProps & SortTypesDataProps) {
  const { github } = getGitHubClient();
  const { baseClonePath, repositoryCloneProtocol } = getPreferenceValues<Preferences.SearchRepositories>();

  const updatedAt = new Date(repository.updatedAt);

  async function star() {
    await showToast({ style: Toast.Style.Animated, title: "Starring repository", message: repository.name });

    try {
      await github.addStar({ repositoryId: repository.id });
      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Starred repository",
        message: repository.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed starring repository",
        message: getErrorMessage(error),
      });
    }
  }

  async function removeStar() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Removing star from repository",
      message: repository.name,
    });

    try {
      await github.removeStar({ repositoryId: repository.id });
      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Removed star from repository",
        message: repository.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed removing star from repository",
        message: getErrorMessage(error),
      });
    }
  }

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  if (repository.primaryLanguage) {
    accessories.unshift({
      text: repository.primaryLanguage.name,
      tooltip: `Language: ${repository.primaryLanguage.name}`,
    });
  }

  if (repository.viewerHasStarred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "You have starred this repository",
    });
  }

  return (
    <ActionPanel title={repository.nameWithOwner}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={repository.url} onOpen={() => onVisit(repository)} />

        <ActionPanel.Submenu icon={Icon.Globe} title="Open in Web IDE">
          {WEB_IDES.map((ide) => (
            <Action.OpenInBrowser
              title={ide.title}
              icon={ide.icon || getFavicon(ide.baseUrl)}
              key={ide.title}
              url={ide.baseUrl + repository.nameWithOwner}
              onOpen={() => onVisit(repository)}
            />
          ))}
        </ActionPanel.Submenu>

        {baseClonePath && (
          <Action
            icon={Icon.Terminal}
            title="Clone and Open"
            onAction={() => cloneAndOpen(repository)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        )}
        {!baseClonePath && (
          <Action.Push
            icon={Icon.Terminal}
            title="Clone with Options"
            target={<CloneRepositoryForm repository={repository} />}
            shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
          />
        )}
        <Action.OpenInBrowser
          icon={{ source: "vscode.svg", tintColor: Color.PrimaryText }}
          title="Clone in VS Code"
          url={`vscode://vscode.git/clone?url=${repository.url}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />

        {repository.viewerHasStarred ? (
          <Action
            title="Remove Star from Repository"
            icon={Icon.StarDisabled}
            onAction={removeStar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
        ) : (
          <Action title="Star" icon={Icon.Star} onAction={star} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Open in Raycast">
        <Action.Push
          title="Show Issues"
          icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
          shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
          target={<RepositoryIssueList repo={repository.nameWithOwner} />}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          title="Show Pull Requests"
          icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
          shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
          target={<RepositoryPullRequestList repo={repository.nameWithOwner} />}
          onPush={() => onVisit(repository)}
        />
        {repository.releases?.totalCount > 0 && (
          <Action.Push
            icon={Icon.List}
            title="Show Releases"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            target={<RepositoryReleases repository={repository} />}
          />
        )}
        {repository.hasDiscussionsEnabled && (
          <Action.Push
            icon={Icon.SpeechBubble}
            title="Show Discussions"
            shortcut={{ modifiers: ["cmd", "ctrl", "opt"], key: "d" }}
            target={<RepositoryDiscussionList repository={repository.nameWithOwner} />}
            onPush={() => onVisit(repository)}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Open in Browser">
        <Action.OpenInBrowser
          icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
          title="Open Pull Requests"
          url={`${repository.url}/pulls`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onOpen={() => onVisit(repository)}
        />

        {repository.hasIssuesEnabled ? (
          <Action.OpenInBrowser
            icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
            title="Open Issues"
            url={`${repository.url}/issues`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onOpen={() => onVisit(repository)}
          />
        ) : null}

        {repository.hasWikiEnabled ? (
          <Action.OpenInBrowser
            icon={{ source: "book.svg", tintColor: Color.PrimaryText }}
            title="Open Wiki"
            url={`${repository.url}/wiki`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onOpen={() => onVisit(repository)}
          />
        ) : null}

        {repository.hasProjectsEnabled && (
          <Action.OpenInBrowser
            icon={{ source: "project.svg", tintColor: Color.PrimaryText }}
            title="Open Projects"
            url={`${repository.url}/projects`}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
            onOpen={() => onVisit(repository)}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={repository.url}
          title="Copy Repository URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          content={buildCloneCommand(repository.nameWithOwner, repositoryCloneProtocol)}
          title="Copy Clone Command"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />

        <Action.CopyToClipboard
          content={repository.nameWithOwner}
          title="Copy Name with Owner"
          shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
        />

        <Action.CopyToClipboard content={repository.name} title="Copy Repository Name" />

        <Action.CopyToClipboard content={repository.owner.login} title="Copy Repository Owner" />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <SortAction {...{ data: sortTypesData, sortQuery, setSortQuery }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
