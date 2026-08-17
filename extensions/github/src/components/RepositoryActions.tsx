import { Action, ActionPanel, Color, getPreferenceValues, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { getFavicon, MutatePromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";
import { cloneAndOpen, buildCloneCommand, WEB_IDES } from "../helpers/repository";

import CloneRepositoryForm from "./CloneRepositoryForm";
import DownloadRepositoryForm from "./DownloadRepositoryForm";
import { RepositoryDiscussionList } from "./RepositoryDiscussions";
import { RepositoryIssueList } from "./RepositoryIssues";
import { RepositoryPullRequestList } from "./RepositoryPullRequest";
import RepositoryReadme from "./RepositoryReadme";
import RepositoryReleases from "./RepositoryReleases";
import { SortAction, SortActionProps, SortTypesDataProps } from "./SortAction";

type RepositoryActionProps<T = ExtendedRepositoryFieldsFragment[] | undefined> = {
  repository: ExtendedRepositoryFieldsFragment;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  onUpdate?: (repository: ExtendedRepositoryFieldsFragment) => void;
  onRemove?: (repository: ExtendedRepositoryFieldsFragment) => void;
  mutateList: MutatePromise<T>;
};

export default function RepositoryActions<T = ExtendedRepositoryFieldsFragment[] | undefined>({
  repository,
  mutateList,
  onVisit,
  onUpdate,
  onRemove,
  setSortQuery,
  sortQuery,
  sortTypesData,
}: RepositoryActionProps<T> & SortActionProps & SortTypesDataProps) {
  const { github } = getGitHubClient();
  const { baseClonePath, repositoryCloneProtocol, application } = getPreferenceValues<Preferences.SearchRepositories>();
  const { vscodeBuild } = getPreferenceValues<Preferences>();
  const editorScheme = vscodeBuild || "vscode";

  function syncStarState(viewerHasStarred: boolean) {
    const updatedRepository = {
      ...repository,
      viewerHasStarred,
      stargazerCount: Math.max(0, repository.stargazerCount + (viewerHasStarred ? 1 : -1)),
    };
    onUpdate?.(updatedRepository);
    return updatedRepository;
  }

  async function star() {
    await showToast({ style: Toast.Style.Animated, title: "Starring repository", message: repository.name });

    try {
      await github.addStar({ repositoryId: repository.id });
      const updatedRepository = syncStarState(true);
      await mutateList(undefined, {
        optimisticUpdate(data) {
          if (!Array.isArray(data)) return data;
          return data.map((repo) => (repo.id === updatedRepository.id ? { ...repo, ...updatedRepository } : repo)) as T;
        },
      });

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
      const updatedRepository = syncStarState(false);
      await mutateList(undefined, {
        optimisticUpdate(data) {
          if (!Array.isArray(data)) return data;
          return data.map((repo) => (repo.id === updatedRepository.id ? { ...repo, ...updatedRepository } : repo)) as T;
        },
      });

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

  return (
    <ActionPanel title={repository.nameWithOwner}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={repository.url} onOpen={() => onVisit(repository)} />

        <ActionPanel.Submenu icon={Icon.Globe} title="Open in Web IDE" shortcut={Keyboard.Shortcut.Common.Open}>
          {WEB_IDES.map((ide) => (
            <Action.OpenInBrowser
              title={ide.title}
              icon={ide.icon || getFavicon(ide.baseUrl)}
              key={ide.title}
              url={ide.baseUrl + repository.nameWithOwner}
              shortcut={ide.shortcut}
              onOpen={() => onVisit(repository)}
            />
          ))}
        </ActionPanel.Submenu>

        {baseClonePath && application && (
          <Action
            icon={Icon.Terminal}
            title="Clone and Open (Default Path)"
            onAction={() => {
              onVisit(repository);
              cloneAndOpen(repository);
            }}
            // Same keys as Common.CopyName, but action is Clone and Open — keep custom binding.
            // eslint-disable-next-line @raycast/prefer-common-shortcut, @raycast/no-ambiguous-platform-shortcut
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        )}
        <Action.Push
          icon={Icon.Terminal}
          title="Clone with Options (Choose Path)"
          target={<CloneRepositoryForm repository={repository} />}
          shortcut={{
            macOS: { modifiers: ["cmd", "opt", "shift"], key: "c" },
            Windows: { modifiers: ["ctrl", "alt", "shift"], key: "c" },
          }}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          icon={Icon.Download}
          title="Download as ZIP"
          target={<DownloadRepositoryForm repository={repository} />}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onPush={() => onVisit(repository)}
        />
        <Action.OpenInBrowser
          icon={{ source: "vscode.svg", tintColor: Color.PrimaryText }}
          title="Clone in VS Code"
          url={`${editorScheme}://vscode.git/clone?url=${repository.url}`}
          // Same keys as Common.Copy, but action is Clone in VS Code — keep custom binding.
          // eslint-disable-next-line @raycast/prefer-common-shortcut, @raycast/no-ambiguous-platform-shortcut
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onOpen={() => onVisit(repository)}
        />

        {repository.viewerHasStarred ? (
          <Action title="Unstar" icon={Icon.Star} onAction={removeStar} shortcut={Keyboard.Shortcut.Common.Pin} />
        ) : (
          <Action title="Star" icon="star-filled.svg" onAction={star} shortcut={Keyboard.Shortcut.Common.Pin} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Open in Raycast">
        <Action.Push
          title="Show Readme"
          icon={Icon.Book}
          shortcut={{
            macOS: { modifiers: ["cmd", "opt"], key: "r" },
            Windows: { modifiers: ["ctrl", "alt"], key: "r" },
          }}
          target={<RepositoryReadme repository={repository} />}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          title="Show Issues"
          icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "i" },
            Windows: { modifiers: ["ctrl"], key: "i" },
          }}
          target={<RepositoryIssueList repo={repository.nameWithOwner} />}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          title="Show Pull Requests"
          icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "m" },
            Windows: { modifiers: ["ctrl"], key: "m" },
          }}
          target={<RepositoryPullRequestList repo={repository.nameWithOwner} />}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          icon={Icon.List}
          title="Show Releases"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "r" },
            Windows: { modifiers: ["ctrl", "shift"], key: "r" },
          }}
          target={<RepositoryReleases repository={repository} />}
          onPush={() => onVisit(repository)}
        />
        <Action.Push
          icon={Icon.SpeechBubble}
          title="Show Discussions"
          shortcut={{
            macOS: { modifiers: ["cmd", "ctrl", "opt"], key: "d" },
            Windows: { modifiers: ["ctrl", "alt"], key: "d" },
          }}
          target={<RepositoryDiscussionList repository={repository.nameWithOwner} />}
          onPush={() => onVisit(repository)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Open in Browser">
        <Action.OpenInBrowser
          icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
          title="Open Pull Requests"
          url={`${repository.url}/pulls`}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "m" },
            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
          }}
          onOpen={() => onVisit(repository)}
        />

        <Action.OpenInBrowser
          icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
          title="Open Issues"
          url={`${repository.url}/issues`}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "i" },
            Windows: { modifiers: ["ctrl", "shift"], key: "i" },
          }}
          onOpen={() => onVisit(repository)}
        />

        <Action.OpenInBrowser
          icon={{ source: "book.svg", tintColor: Color.PrimaryText }}
          title="Open Wiki"
          url={`${repository.url}/wiki`}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "w" },
            Windows: { modifiers: ["ctrl", "shift"], key: "w" },
          }}
          onOpen={() => onVisit(repository)}
        />

        <Action.OpenInBrowser
          icon={{ source: "project.svg", tintColor: Color.PrimaryText }}
          title="Open Projects"
          url={`${repository.url}/projects`}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift", "opt"], key: "p" },
            Windows: { modifiers: ["ctrl", "shift", "alt"], key: "p" },
          }}
          onOpen={() => onVisit(repository)}
        />
        <Action.OpenInBrowser
          icon={Icon.SpeechBubble}
          title="Open Discussions"
          url={`${repository.url}/discussions`}
          onOpen={() => onVisit(repository)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={repository.url}
          title="Copy Repository URL"
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />

        <Action.CopyToClipboard
          content={buildCloneCommand(repository.nameWithOwner, repositoryCloneProtocol)}
          title="Copy Clone Command"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "." },
            Windows: { modifiers: ["ctrl", "shift"], key: "." },
          }}
        />

        <Action.CopyToClipboard
          content={repository.nameWithOwner}
          title="Copy Name with Owner"
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />

        <Action.CopyToClipboard content={repository.name} title="Copy Repository Name" />

        <Action.CopyToClipboard content={repository.owner.login} title="Copy Repository Owner" />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <SortAction {...{ data: sortTypesData, sortQuery, setSortQuery }} />
      </ActionPanel.Section>

      {onRemove ? (
        <ActionPanel.Section>
          <Action
            title="Remove from Recently Visited"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onRemove(repository)}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
