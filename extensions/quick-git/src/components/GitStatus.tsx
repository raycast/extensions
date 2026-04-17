import { useMemo } from "react";
import { ActionPanel, List } from "@raycast/api";
import { useSelectedRepoStorage } from "../hooks/useRepo.js";
import { GitStatusItem } from "./GitStatus/GitStatusItem.js";
import { RemoteGitActions } from "./GitStatus/RemoteGitActions.js";
import { GitStatusEmpty } from "./GitStatus/GitStatusEmpty.js";
import { ChangeCurrentBranch } from "./actions/ChangeCurrentBranch.js";
import { SetRepo } from "./actions/SetRepo.js";
import { Providers } from "./Providers.js";
import { useHasSubmodles } from "../hooks/useHasSubmodules.js";
import { ChangeSubmodules } from "./actions/ChangeSubmodules.js";
import { navigationTitle } from "../utils/navigationTitle.js";
import { useGitStatus } from "../hooks/useGitStatus.js";

export function GitStatus() {
  const repo = useSelectedRepoStorage();
  const { data: hasSubmodule, isLoading: checkingSubmodules } = useHasSubmodles(repo.value);
  const { data, isLoading, revalidate } = useGitStatus(repo.value);

  const showDetails = !!repo.value && !!data?.files.length;

  const statusActions = repo.value ? (
    <>
      <ChangeCurrentBranch />
      {hasSubmodule && <ChangeSubmodules changeRepo={repo.setValue} />}
      <RemoteGitActions />
      <SetRepo title="Change Current Repo" />
    </>
  ) : (
    <SetRepo />
  );

  const statusItems = useMemo(() => {
    if (!data?.files.length) {
      return (
        <GitStatusEmpty
          ahead={data?.branch.ahead}
          behind={data?.branch.behind}
          name={data?.branch.name}
          upstream={data?.branch.upstream}
        />
      );
    }

    return data.files.map((item) => <GitStatusItem key={item.fileName} status={item} branch={data.branch} />);
  }, [data]);

  return (
    <Providers repo={repo} checkStatus={revalidate}>
      <List
        searchBarPlaceholder="Search modified files…"
        navigationTitle={navigationTitle("Git Status", repo.value)}
        isShowingDetail={showDetails}
        isLoading={repo.isLoading || isLoading || checkingSubmodules}
        actions={<ActionPanel>{statusActions}</ActionPanel>}
      >
        {statusItems}
      </List>
    </Providers>
  );
}
