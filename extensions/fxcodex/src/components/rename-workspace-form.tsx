import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { WorkspaceStatus } from "../lib/models";
import { mutate } from "../lib/ui";

export function RenameWorkspaceForm({ workspace, onChange }: { workspace: WorkspaceStatus; onChange: () => void }) {
	const { pop } = useNavigation();

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Rename Workspace"
						onSubmit={async (values: { name: string }) => {
							const newName = values.name.trim();
							await mutate(
								["workspace", "rename", workspace.workspace.name, newName],
								"Renaming workspace…",
								() => undefined,
							);
							onChange();
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField id="name" title="New Name" defaultValue={workspace.workspace.name} />
		</Form>
	);
}
