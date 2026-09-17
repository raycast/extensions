import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { mutate } from "../lib/ui";

export function CreateWorkspaceForm({ onChange }: { onChange: () => void }) {
	const { pop } = useNavigation();

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Create Workspace"
						onSubmit={async (values: { name: string; use: boolean; open: boolean }) => {
							const args = ["workspace", "create", values.name.trim()];
							if (values.use) args.push("--use");
							if (values.open) args.push("--open");
							await mutate(args, "Creating workspace…", onChange);
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField id="name" title="Name" placeholder="work" />
			<Form.Checkbox id="use" label="Set as current workspace" defaultValue />
			<Form.Checkbox id="open" label="Open after creating" />
		</Form>
	);
}
