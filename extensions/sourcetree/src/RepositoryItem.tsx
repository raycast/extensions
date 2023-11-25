import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAhead, getBehind, getBranch, Repository } from "./lib/repository";
import { OpenInSourceTreeApp } from "./OpenInSourceTreeApp";

interface GitState {
  branch: string | null;
  ahead: string | null;
  behind: string | null;
}

interface RepositoryItemProps {
  repo: Repository;
}

export function RepositoryItem({ repo }: RepositoryItemProps): JSX.Element {
  const { data } = useCachedPromise(getGitStatus, [repo.path], {
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

function prepareAccessory(state?: GitState): List.Item.Accessory[] {
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

function getGitStatus(path: string): Promise<GitState> {
  const branch = getBranch(path);
  const ahead = getAhead(path);
  const behind = getBehind(path);

  return Promise.all([branch, ahead, behind]).then((values) => ({
    branch: values[0],
    ahead: values[1],
    behind: values[2],
  }));
}
