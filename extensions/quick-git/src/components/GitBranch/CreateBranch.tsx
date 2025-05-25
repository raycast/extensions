import {
	Action,
	ActionPanel,
	Form,
	showToast,
	useNavigation,
} from "@raycast/api"
import { useExec, useForm } from "@raycast/utils"
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
			failureToastOptions: {
				title: `Could not create a branch called ${branchName}`,
			},
		},
	)
	const { pop } = useNavigation()
	const { handleSubmit, itemProps } = useForm({
		onSubmit: revalidate,
		validation: {
			newBranch: (value) => {
				if (!value) {
					return "A branch name is required"
				} else if (/\s/g.test(value)) {
					return "No whitespace characters are allowed, please use a '-' or '_' instead"
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
