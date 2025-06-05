import { ActionPanel, List } from "@raycast/api"
import { useMemo } from "react"
import { GitBranchItemActions } from "./GitBranchItemActions.js"

interface Props {
	branch: string
	repo: string
	checkBranches: () => void
	checkStatus: () => void
}

export function GitBranchItem({ branch, repo, checkBranches, checkStatus }: Props) {
	// Git indicates the current branch by start that row with with a `*`
	const currentBranch = useMemo(() => branch.startsWith("*"), [branch])

	const title = useMemo(() => {
		if (currentBranch) {
			// Skip over the leading `*` and whitespace
			return branch.slice(2)
		}

		return branch
	}, [branch, currentBranch])

	const accessories = useMemo(() => {
		if (currentBranch) {
			return [{ text: "Current branch" }]
		}
	}, [currentBranch])

	return (
		<List.Item
			title={title}
			accessories={accessories}
			actions={
				<ActionPanel>
					<GitBranchItemActions
						repo={repo}
						branch={title}
						isCurrentBranch={currentBranch}
						checkStatus={checkStatus}
						checkBranches={checkBranches}
					/>
				</ActionPanel>
			}
		/>
	)
}
