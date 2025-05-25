import {
	Action,
	ActionPanel,
	Form,
	showToast,
	useNavigation,
} from "@raycast/api"
import { showFailureToast, useExec, useForm } from "@raycast/utils"
import { useState } from "react"

interface Props {
	repo: string
	checkBranches: () => void
	checkStatus: () => void
}

export default function CreateBranch({
	repo,
	checkBranches,
	checkStatus,
}: Props) {
	const [branchName, setBranchName] = useState("")
	const { revalidate, isLoading } = useExec(
		"git",
		["switch", "-c", branchName],
		{
			cwd: repo,
			execute: false,
			onData: () => {
				checkBranches()
				checkStatus()
				showToast({ title: "Created branch" })
				pop()
			},
			onError: (error) => {
				showFailureToast(error, {
					title: `Could not create a branch called ${branchName}`,
				})
			},
		},
	)
	const { pop } = useNavigation()
	const { handleSubmit, itemProps } = useForm({
		onSubmit: revalidate,
		validation: {
			newBranch: (value) => {
				const branchName = value.trim()
				if (!branchName) {
					return "A branch name is required"
				} else if (/[~^:?*[\\\s]/g.test(value)) {
					return "Branch name contains invalid characters. Avoid using ~, ^, :, ?, *, [, \\, or any whitespace characters"
				} else if (branchName.startsWith("-")) {
					return "Branch name cannot start with '-'"
				}
			},
		},
	})

	return (
		<Form
			navigationTitle="Create New Branch"
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField
				id="newBranch"
				title="New branch name"
				info="Do not include any whitespace characters"
				value={branchName}
				onChange={setBranchName}
				placeholder="new-feature-branch"
				autoFocus
				error={itemProps.newBranch.error}
			/>
		</Form>
	)
}
