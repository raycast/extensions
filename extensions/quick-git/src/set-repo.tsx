import {
	Action,
	ActionPanel,
	Form,
	launchCommand,
	LaunchType,
	showToast,
	Toast,
} from "@raycast/api"
import {
	FormValidation,
	showFailureToast,
	useForm,
	useLocalStorage,
} from "@raycast/utils"

export default function Command() {
	const { value, setValue, removeValue, isLoading } = useLocalStorage<
		string | undefined
	>("selectedRepo")

	const { handleSubmit, itemProps } = useForm({
		onSubmit({ newRepo }: { newRepo: string[] }) {
			setValue(newRepo[0])
				.then(() => {
					showToast({
						style: Toast.Style.Success,
						title: "Repo set",
						message: `${newRepo[0]}`,
					})
					launchCommand({
						name: "quick-git",
						type: LaunchType.UserInitiated,
					})
				})
				.catch((error) => {
					showFailureToast(error, {
						title: "Could not set this as your selected repo",
					})
				})
		},
		validation: {
			newRepo: FormValidation.Required,
		},
	})

	return (
		<Form
			navigationTitle="Select Git Repo"
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Set Repo" onSubmit={handleSubmit} />
					<Action.SubmitForm title="Unset Repo" onSubmit={removeValue} />
				</ActionPanel>
			}
		>
			<Form.FilePicker
				id="newRepo"
				title="Repo Directory"
				canChooseDirectories
				storeValue
				allowMultipleSelection={false}
				canChooseFiles={false}
				defaultValue={value ? [value] : undefined}
				autoFocus
				error={itemProps.newRepo.error}
			/>
		</Form>
	)
}
