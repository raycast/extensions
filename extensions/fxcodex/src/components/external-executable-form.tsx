import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { setExternalExecutablePath } from "../lib/executable";

export function ExternalExecutableForm({ onChange }: { onChange: () => void }) {
	const { pop } = useNavigation();

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Use Executable"
						onSubmit={async (values: { executable: string[] }) => {
							const path = values.executable[0];
							if (!path) throw new Error("Choose an executable.");
							await setExternalExecutablePath(path);
							onChange();
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.FilePicker
				id="executable"
				title="fxCodex Executable"
				allowMultipleSelection={false}
				canChooseDirectories={false}
			/>
		</Form>
	);
}
