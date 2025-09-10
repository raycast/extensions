import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getRepositoryState, RepositoryState, Repository } from "./lib/repository";
import { OpenInSourceTreeApp } from "./OpenInSourceTreeApp";

interface RepositoryItemProps {
  repo: Repository;
}

export function RepositoryItem({ repo }: RepositoryItemProps) {
  const { data } = useCachedPromise(getRepositoryState, [repo.path, repo.repositoryType], {
    keepPreviousData: true,
    execute: true,
  });

  let repoIcon = "repo.svg";

  if (!repo.exists) {
    repoIcon = "repo-template.svg";
  }

  return (
    <List.Item
      key={repo.hashValue}
      icon={{ source: repoIcon, tintColor: Color.PrimaryText }}
      title={repo.name}
      keywords={repo.tree}
      subtitle={repo.tree.slice(1).join(" / ")}
      actions={
        repo.exists ? (
          <ActionPanel>
            <OpenInSourceTreeApp repo={repo} />
            <Action.OpenWith path={repo.path} />
          </ActionPanel>
        ) : null
      }
      accessories={prepareAccessory(data)}
    />
  );
}

function prepareAccessory(state?: RepositoryState): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (!state) {
    return accessories;
  }

  const branchIcon = {
    source: "git-branch.svg",
    tintColor: Color.SecondaryText,
  };

  const aheadIcon = {
    source: "arrow-up-right.svg",
    tintColor: Color.Green,
  };

  const behindIcon = {
    source: "arrow-down-left.svg",
    tintColor: Color.Blue,
  };

  if (state.behind && state.behind != "0") {
    accessories.push({
      icon: behindIcon,
      text: state.behind,
    });
  }

  if (state.ahead && state.ahead != "0") {
    accessories.push({
      icon: aheadIcon,
      text: state.ahead,
    });
  }

  if (state.branch) {
    accessories.push({
      icon: branchIcon,
      text: state.branch,
    });
  }

  return accessories;
}
