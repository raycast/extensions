import { Action, ActionPanel, Form, Icon, Image, Toast, showToast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { ExecutableSource, WorkspaceStatus } from "../lib/models";
import { setCustomWorkspaceIcon, WorkspaceIcon } from "../lib/workspace-icons";

export function WorkspaceIconForm({
	workspace,
	selectedIcon,
	executableSource,
	onChange,
	onComplete,
}: {
	workspace: WorkspaceStatus;
	selectedIcon?: WorkspaceIcon;
	executableSource?: ExecutableSource;
	onChange: () => void;
	onComplete: () => void;
}) {
	const { pop } = useNavigation();
	const customIcon = selectedIcon?.type === "custom" ? selectedIcon : undefined;
	const [anyAppearancePath, setAnyAppearancePath] = useState(customIcon?.anyAppearancePath);
	const [darkAppearancePath, setDarkAppearancePath] = useState(customIcon?.darkAppearancePath);
	const [rounded, setRounded] = useState(customIcon?.rounded ?? true);

	return (
		<Form
			navigationTitle={`Custom Icon for ${workspace.workspace.name}`}
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Use Custom Image"
						icon={Icon.Check}
						onSubmit={async () => {
							if (!anyAppearancePath) throw new Error("Choose an image for any appearance.");

							await setCustomWorkspaceIcon(
								workspace.workspace.id,
								anyAppearancePath,
								darkAppearancePath,
								rounded,
								executableSource,
							);
							await showToast({ style: Toast.Style.Success, title: "Custom Icon Set" });
							onChange();
							pop();
							setTimeout(onComplete, 0);
						}}
					/>
				</ActionPanel>
			}
		>
			<AppearanceFields
				id="anyAppearance"
				title="Any Appearance"
				path={anyAppearancePath}
				rounded={rounded}
				onChange={setAnyAppearancePath}
			/>
			<AppearanceFields
				id="darkAppearance"
				title="Dark Appearance"
				path={darkAppearancePath}
				rounded={rounded}
				onChange={setDarkAppearancePath}
			/>
			<Form.Separator />
			<Form.Checkbox
				id="rounded"
				title="Style"
				label="Rounded"
				value={rounded}
				onChange={setRounded}
				info="Apply Raycast's rounded rectangle mask."
			/>
		</Form>
	);
}

function AppearanceFields({
	id,
	title,
	path,
	rounded,
	onChange,
}: {
	id: string;
	title: string;
	path?: string;
	rounded: boolean;
	onChange: (path: string | undefined) => void;
}) {
	const pickerRef = useRef<Form.FilePicker>(null);

	return (
		<>
			<Form.Dropdown
				id={`${id}Preview`}
				title={title}
				value={path ? "icon" : "none"}
				onChange={(value) => {
					if (value === "remove") onChange(undefined);
				}}
			>
				{path ? (
					<>
						<Form.Dropdown.Item
							value="icon"
							title="Icon"
							icon={{
								source: path,
								...(rounded ? { mask: Image.Mask.RoundedRectangle } : {}),
							}}
						/>
						<Form.Dropdown.Item value="remove" title="Remove" icon={Icon.Trash} />
					</>
				) : (
					<Form.Dropdown.Item value="none" title="None" icon={Icon.MinusCircle} />
				)}
			</Form.Dropdown>
			<Form.FilePicker
				ref={pickerRef}
				id={id}
				title=""
				allowMultipleSelection={false}
				canChooseDirectories={false}
				onChange={(selection) => {
					const selectedPath = selection[0];
					if (!selectedPath) return;

					onChange(selectedPath);
					pickerRef.current?.reset();
				}}
				info="PNG, JPEG, GIF, WebP, or SVG"
			/>
		</>
	);
}
