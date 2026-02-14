import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useGitRepository } from "./hooks/useGitRepository";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { BranchesView } from "./components/views/BranchesView";
import { StatusView } from "./components/views/StatusView";
import { CommitsView } from "./components/views/CommitsView";
import { StashesView } from "./components/views/StashesView";
import FilesView from "./components/views/FilesView";
import { useEffect, useState } from "react";
import { useGitBranches } from "./hooks/useGitBranches";
import { useGitCommits } from "./hooks/useGitCommits";
import { useGitStash } from "./hooks/useGitStash";
import { useGitStatus } from "./hooks/useGitStatus";
import {
  GitView,
  BranchesState,
  StatusState,
  Stash,
  Commit,
  ListPagination,
  DetachedHead,
  Tag,
  Submodule,
  Branch,
  Remote,
  Preferences,
} from "./types";
import { useGitRemotes } from "./hooks/useGitRemotes";
import RemotesView from "./components/views/RemotesView";
import TagsView from "./components/views/TagsView";
import { useGitSubmodules } from "./hooks/useGitSubmodules";
import { GitManager } from "./utils/git-manager";
import { useGitTags } from "./hooks/useGitTags";
import SubmodulesView from "./components/views/SubmodulesView";

interface Arguments {
  path: string;
  currentView?: GitView;
  shouldSaveVisit?: boolean;
}

export type BranchFilter =
  | { kind: "all" }
  | { kind: "current"; upstream: boolean }
  | { kind: "branch"; value: Pick<Branch, "name" | "type" | "remote"> };

export type SelectedBranch = ({ kind: "branch" } & Branch) | ({ kind: "detached" } & DetachedHead);

export type RepositoryContext = {
  gitManager: GitManager;
  remotes: {
    data: Record<string, Remote>;
    isLoading: boolean;
    revalidate: () => void;
  };
  branches: {
    data: BranchesState;
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  tags: {
    data: Tag[];
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  commits: {
    data: Commit[];
    selectedBranch?: SelectedBranch;
    filter: BranchFilter;
    isLoading: boolean;
    error: Error | undefined;
    pagination: ListPagination | undefined;
    setFilter: (filter: BranchFilter) => void;
    revalidate: () => void;
  };
  stashes: {
    data: Stash[];
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  status: {
    data: StatusState;
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  submodules: {
    data: Submodule[];
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
};

export type NavigationContext = {
  currentView: GitView;
  navigateTo: (destination: GitView) => void;
  switchTo: (repositoryPath: string) => void;
};

export default function OpenRepository({ arguments: args }: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const [currentView, setCurrentView] = args.currentView
    ? useState<GitView>(args.currentView)
    : preferences.initialTab === "recent"
      ? useCachedState<GitView>("git-current-view", "branches")
      : useState<GitView>(preferences.initialTab as GitView);

  const [repositoryPath, setRepositoryPath] = useState<string>(args.path);

  // Hook for working with a Git repository (synchronous validation)
  const { gitManager, error } = useGitRepository(repositoryPath);

  // Hook for managing recent repositories
  const { visitRepository } = useRepositoriesList();

  // Add repository to recent cache when successfully opened
  useEffect(() => {
    if (gitManager && repositoryPath && args.shouldSaveVisit !== false) {
      visitRepository(repositoryPath);
    }
  }, [repositoryPath, visitRepository, args.shouldSaveVisit]);

  // Validation error state
  if (error || !gitManager) {
    return (
      <List navigationTitle="Git Repository">
        <List.EmptyView
          title="Error opening repository"
          description={error?.message || "Unknown error"}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  // Shared data hooks lifted to the top-level to persist across view switches
  const remotesContext = useGitRemotes(gitManager);
  const submodulesContext = useGitSubmodules(gitManager);
  const branchesContext = useGitBranches(gitManager);
  const tagsContext = useGitTags(gitManager);
  const commitsContext = useGitCommits(gitManager, branchesContext.data);
  const stashesContext = useGitStash(gitManager);
  const statusContext = useGitStatus(gitManager);

  const rootContext: RepositoryContext & NavigationContext = {
    gitManager,
    remotes: remotesContext,
    submodules: submodulesContext,
    branches: branchesContext,
    commits: commitsContext,
    stashes: stashesContext,
    status: statusContext,
    tags: tagsContext,
    currentView,
    navigateTo: setCurrentView,
    switchTo: setRepositoryPath,
  };

  // Render the corresponding view
  switch (currentView) {
    case "status":
      return <StatusView {...rootContext} />;
    case "commits":
      return <CommitsView {...rootContext} />;
    case "branches":
      return <BranchesView {...rootContext} />;
    case "tags":
      return <TagsView {...rootContext} />;
    case "remotes":
      return <RemotesView {...rootContext} />;
    case "submodules":
      return <SubmodulesView {...rootContext} />;
    case "stashes":
      return <StashesView {...rootContext} />;
    case "files":
      return <FilesView {...rootContext} />;
    default:
      setCurrentView("branches");
  }
}
