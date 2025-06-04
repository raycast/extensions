import { useState } from "react"
import {
	Action,
	ActionPanel,
	Form,
	Icon,
	showToast,
	useNavigation,
} from "@raycast/api"
import {
	FormValidation,
	showFailureToast,
	useExec,
	useForm,
} from "@raycast/utils"

interface Props {
	repo: string
	checkStatus: () => void
}

export const GitCommit = ({ repo, checkStatus }: Props) => {
	const { pop } = useNavigation()
	const [commitMsg, setCommitMsg] = useState("")
	const { revalidate: commit } = useExec("git", ["commit", "-m", commitMsg], {
		cwd: repo,
		execute: false,
		onData: () => {
			checkStatus()
			showToast({ title: "Committed changed" })
			pop()
		},
		onError: (error) => {
			showFailureToast(error, { title: "Could not commit changes" })
		},
	})
	const { handleSubmit, itemProps } = useForm({
		onSubmit: commit,
		validation: {
			commitMsg: FormValidation.Required,
		},
	})

	return (
		<Form
			navigationTitle="Commit Staged Changes"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Commit"
						onSubmit={handleSubmit}
						icon={Icon.Checkmark}
					/>
				</ActionPanel>
			}
		>
			<Form.TextArea
				id="commitMsg"
				title="Commit message"
				value={commitMsg}
				onChange={setCommitMsg}
				error={itemProps.commitMsg.error}
			/>
		</Form>
	)
}
