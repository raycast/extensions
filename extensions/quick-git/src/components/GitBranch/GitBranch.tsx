import { ActionPanel, List } from "@raycast/api"
import { showFailureToast, useExec } from "@raycast/utils"
import { GitBranchItem } from "./GitBranchItem.js"
import { GitBranchActions } from "./GitBranchActions.js"

interface Props {
	repo: string
	checkStatus: () => void
}

export function GitBranch({ repo, checkStatus }: Props) {
	const { data, isLoading, revalidate } = useExec("git", ["branch", "--sort=-committerdate"], {
		cwd: repo,
		parseOutput: ({ stdout }) => {
			return stdout.split("\n")
		},
		onError: (error) => {
			showFailureToast(error, { title: "Could not get branch list" })
		},
		stripFinalNewline: true,
	})

	return (
		<List
			searchBarPlaceholder="Search branches…"
			navigationTitle="Change Branches"
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<GitBranchActions repo={repo} checkBranches={revalidate} checkStatus={checkStatus} />
				</ActionPanel>
			}
		>
			{data?.map((branch) => (
				<GitBranchItem
					key={branch.replace(/^\*\s/, "")}
					branch={branch.trim()}
					repo={repo}
					checkBranches={revalidate}
					checkStatus={checkStatus}
				/>
			)) ?? <List.EmptyView title="There are no branches" />}
		</List>
	)
}
