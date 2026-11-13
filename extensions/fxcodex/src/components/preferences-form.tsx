import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { invoke, loadStatus } from "../lib/client";
import { selectedExecutableSource } from "../lib/executable";
import { FXCodexPreferences } from "../lib/models";

export function PreferencesForm({ onChange }: { onChange: () => void }) {
	const { pop } = useNavigation();
	const { data, error, isLoading } = usePromise(async () => {
		const source = await selectedExecutableSource();
		return {
			source,
			preferences: (await loadStatus(source)).data.preferences,
		};
	}, []);

	if (isLoading) return <Form isLoading />;
	if (error || !data?.preferences) {
		return (
			<Form>
				<Form.Description
					title="Preferences Unavailable"
					text={error instanceof Error ? error.message : "fxCodex did not return preferences."}
				/>
			</Form>
		);
	}

	const policy = data.preferences.autoUpdate;

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Save Preferences"
						onSubmit={async (values: { autoRename: boolean; updatePolicy: string; minimumVersion: string }) => {
							await invoke<FXCodexPreferences>(
								["preferences", "set", "auto-rename", String(values.autoRename)],
								data.source,
							);
							const args = ["preferences", "set", "auto-update"];
							if (values.updatePolicy === "disabled") args.push("--disabled");
							else {
								if (!values.minimumVersion.trim())
									throw new Error("A minimum version is required for automatic updates.");
								args.push(`--${values.updatePolicy}-from`, values.minimumVersion.trim());
							}
							await invoke<FXCodexPreferences>(args, data.source);
							onChange();
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.Checkbox
				id="autoRename"
				label="Automatically rename ChatGPT.app to Codex.app"
				defaultValue={data.preferences.autoRename}
			/>
			<Form.Dropdown id="updatePolicy" title="Auto Update" defaultValue={policy?.channel ?? "disabled"}>
				<Form.Dropdown.Item value="disabled" title="Disabled" />
				<Form.Dropdown.Item value="patch" title="Patch" />
				<Form.Dropdown.Item value="minor" title="Minor" />
				<Form.Dropdown.Item value="major" title="Major" />
				<Form.Dropdown.Item value="latest" title="Latest Including Prereleases" />
			</Form.Dropdown>
			<Form.TextField id="minimumVersion" title="From Version" placeholder="1.2.3" defaultValue={policy?.from} />
			<Form.Description text="User and custom installations honor this policy. Versioned extension-support installations stay pinned until manually replaced; Homebrew controls its own upgrades." />
		</Form>
	);
}
