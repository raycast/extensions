import { ActionPanel, Icon, List } from "@raycast/api"
import { useMemo } from "react"
import { GitBranchItemActions } from "./GitBranchItemActions.js"

interface Props {
	branch: string
	repo: string
	checkBranches: () => void
	checkStatus: () => void
}

export function GitBranchItem({
	branch,
	repo,
	checkBranches,
	checkStatus,
}: Props) {
	const currentBranch = useMemo(() => branch.startsWith("*"), [branch])
	const title = useMemo(() => {
		if (currentBranch) {
			return branch.slice(2)
		}

		return branch
	}, [branch, currentBranch])

	const icon = useMemo(() => {
		if (currentBranch) {
			return { value: Icon.Dot, tooltip: "Current branch" }
		}
	}, [currentBranch])

	return (
		<List.Item
			title={title}
			icon={icon}
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
