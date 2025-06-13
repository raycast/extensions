import { ActionPanel, List } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../hooks/useRepo.js";
import { GitBranchItem } from "./GitBranches/GitBranchItem.js";
import { CreateNewBranch } from "./actions/CreateNewBranch.js";
import { SwitchToLastBranch } from "./actions/SwitchToLastBranch.js";
import { useMemo } from "react";

interface Props {
  checkStatus: () => void;
}

export function GitBranches({ checkStatus }: Props) {
  const { value } = useRepo();
  const { data, isLoading, revalidate } = useExec("git", ["branch", "--sort=-committerdate"], {
    cwd: value,
    parseOutput: ({ stdout }) => {
      return stdout.split("\n");
    },
    onData: () => {
      checkStatus();
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not get branch list" });
    },
    stripFinalNewline: true,
  });

  const branchItems = useMemo(() => {
    if (!data) {
      return <List.EmptyView title="There are no branches" />;
    }

    return data.map((branch) => (
      <GitBranchItem key={branch.replace(/^\*\s/, "")} branch={branch.trim()} checkBranches={revalidate} />
    ));
  }, [data, revalidate]);

  return (
    <List
      searchBarPlaceholder="Search branches…"
      navigationTitle="Change Branches"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <CreateNewBranch checkBranches={revalidate} />
          <SwitchToLastBranch checkBranches={revalidate} />
        </ActionPanel>
      }
    >
      {branchItems}
    </List>
  );
}
