import { useCallback, useMemo } from "react";
import { ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec, useFrecencySorting } from "@raycast/utils";
import { parseRepoDirectoryName, RepoDir } from "../utils/repos.js";
import { RepoContext, useRepoStorage } from "../hooks/useRepo.js";
import { GitRepoItem } from "./GitRepos/GitRepoItem.js";
import { launchQuickGit } from "../utils/launchCommands.js";
import { ChooseSpecificRepo } from "./actions/ChooseSpecificRepo.js";

export function GitRepos() {
  const currentRepo = useRepoStorage();
  const repoLocation = getPreferenceValues<Preferences>()["repo-locations"];
  const { data, isLoading } = useExec(
    "find",
    [repoLocation, "-name .git", "-type d", "-prune", "-exec", "dirname", "{}", "\\;"],
    {
      shell: true,
      parseOutput: ({ stdout }) => {
        return parseRepoDirectoryName(stdout, repoLocation);
      },
      onError: (error) => {
        showFailureToast(error, { title: "Could not get git repos" });
      },
      stripFinalNewline: true,
    },
  );
  const { data: sortedData, visitItem } = useFrecencySorting(data);

  const changeRepo = useCallback(
    (item: RepoDir) => {
      visitItem(item);
      currentRepo.setValue(item.id).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Repo set",
          message: item.label,
        });

        launchQuickGit();
      });
    },
    [currentRepo, visitItem],
  );

  const repos = useMemo(() => {
    if (!sortedData?.length) {
      return <List.EmptyView title="There are no git repositories" />;
    }

    return sortedData.map((repo) => (
      <GitRepoItem key={repo.id} repoDir={repo} isSelected={repo.id === currentRepo.value} changeRepo={changeRepo} />
    ));
  }, [changeRepo, currentRepo.value, sortedData]);

  return (
    <RepoContext value={currentRepo.value ?? ""}>
      <List
        searchBarPlaceholder="Search git repos…"
        navigationTitle="Change Git Repo"
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <ChooseSpecificRepo />
          </ActionPanel>
        }
      >
        {repos}
      </List>
    </RepoContext>
  );
}
