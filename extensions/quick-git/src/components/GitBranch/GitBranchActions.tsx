import { Action, Icon, Keyboard, showToast } from "@raycast/api"
import { showFailureToast, useExec } from "@raycast/utils"
import CreateBranch from "./CreateBranch.js"

interface Props {
	repo: string
	checkBranches: () => void
	checkStatus: () => void
}

export function GitBranchActions({ repo, checkBranches, checkStatus }: Props) {
	const { revalidate: switchToLastBranch } = useExec("git", ["switch", "-"], {
		cwd: repo,
		execute: false,
		onData: () => {
			checkBranches()
			checkStatus()
			showToast({ title: "Changed branch" })
		},
		onError: (error) => {
			showFailureToast(error, { title: "Could not switch branches" })
		},
	})

	return (
		<>
			<Action.Push
				icon={Icon.Plus}
				title="Create a New Branch"
				shortcut={Keyboard.Shortcut.Common.New}
				target={<CreateBranch repo={repo} checkBranches={checkBranches} checkStatus={checkStatus} />}
			/>
			<Action
				icon={Icon.Replace}
				shortcut={{ key: "-", modifiers: ["cmd"] }}
				title="Switch to Your Last Branch"
				onAction={switchToLastBranch}
			/>
		</>
	)
}
