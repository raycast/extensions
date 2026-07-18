import {
	Action,
	ActionPanel,
	Alert,
	Color,
	Form,
	Icon,
	List,
	Toast,
	confirmAlert,
	showToast,
	useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { invoke, loadStatus, loadVersion } from "../lib/client";
import {
	bundledExecutablePath,
	installExternalExecutable,
	resolveExecutable,
	selectExecutableSource,
	selectedExecutableSource,
	setExternalExecutablePath,
	uninstallExternalExecutable,
} from "../lib/executable";
import { ExecutableSource, FXCodexPreferences } from "../lib/models";
import { capitalize, verifyChecksum } from "../lib/ui";

export function ExecutableView({ onChange }: { onChange: () => void }) {
	const { data, isLoading, revalidate } = usePromise(async () => {
		const selected = await selectedExecutableSource();
		const bundled = await resolveExecutable("bundled");
		const external = await resolveExecutable("external");
		const bundledVersion = bundled.isInstalled ? (await loadVersion("bundled")).data.version : undefined;
		let externalVersion: string | undefined;
		if (external.isInstalled) {
			try {
				externalVersion = (await loadVersion("external")).data.version;
			} catch {
				externalVersion = undefined;
			}
		}
		return { selected, bundled, external, bundledVersion, externalVersion };
	}, []);

	const select = async (source: ExecutableSource) => {
		if (source === "external" && !data?.external.isInstalled) {
			if (
				!(await confirmAlert({
					title: "Install External fxCodex?",
					message: "fxCodex will be installed in ~/.local/bin.",
					primaryAction: { title: "Install" },
				}))
			)
				return;
			await installExternalExecutable();
		}
		await selectExecutableSource(source);
		await showToast({ style: Toast.Style.Success, title: `Using ${capitalize(source)} fxCodex` });
		revalidate();
		onChange();
	};

	return (
		<List isLoading={isLoading}>
			<List.Section title="Sources">
				<List.Item
					title="Bundled"
					subtitle={data?.bundledVersion}
					icon={Icon.Box}
					accessories={data?.selected === "bundled" ? [{ tag: { value: "Selected", color: Color.Green } }] : []}
					actions={
						<ActionPanel>
							<Action title="Use Bundled" onAction={() => select("bundled")} />
							<Action title="Verify Checksum" onAction={verifyChecksum} />
							<Action.ShowInFinder title="Show in Finder" path={bundledExecutablePath()} />
						</ActionPanel>
					}
				/>
				<List.Item
					title="External"
					subtitle={data?.external.isInstalled ? (data.externalVersion ?? data.external.path) : "Not Installed"}
					icon={Icon.Terminal}
					accessories={data?.selected === "external" ? [{ tag: { value: "Selected", color: Color.Green } }] : []}
					actions={
						<ActionPanel>
							<Action
								title={data?.external.isInstalled ? "Use External" : "Install and Use External"}
								onAction={() => select("external")}
							/>
							{data?.external.isInstalled && (
								<Action title="Update…" onAction={() => updateExternal(data.externalVersion, revalidate, onChange)} />
							)}
							{data?.external.isManaged && (
								<Action
									title="Uninstall…"
									style={Action.Style.Destructive}
									onAction={() => uninstallExternal(revalidate, onChange)}
								/>
							)}
							<Action.Push
								title="Choose Existing Executable…"
								target={
									<ExternalExecutableForm
										onChange={() => {
											revalidate();
											onChange();
										}}
									/>
								}
							/>
							{data?.external.isInstalled && <Action.ShowInFinder title="Show in Finder" path={data.external.path} />}
						</ActionPanel>
					}
				/>
			</List.Section>
			<List.Section title="Configuration">
				<List.Item
					title="Preferences"
					icon={Icon.Gear}
					actions={
						<ActionPanel>
							<Action.Push
								title="Manage Preferences"
								target={
									<PreferencesForm
										onChange={() => {
											revalidate();
											onChange();
										}}
									/>
								}
							/>
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
}

function ExternalExecutableForm({ onChange }: { onChange: () => void }) {
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
							await selectExecutableSource("external");
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

function PreferencesForm({ onChange }: { onChange: () => void }) {
	const { pop } = useNavigation();
	const { data } = usePromise(async () => (await loadStatus("bundled")).data.preferences, []);
	if (!data) return <Form isLoading />;
	const policy = data.autoUpdate;
	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Save Preferences"
						onSubmit={async (values: { autoRename: boolean; updatePolicy: string; minimumVersion: string }) => {
							await invoke<FXCodexPreferences>(
								["preferences", "set", "auto-rename", String(values.autoRename)],
								"bundled",
							);
							const args = ["preferences", "set", "auto-update"];
							if (values.updatePolicy === "disabled") args.push("--disabled");
							else {
								if (!values.minimumVersion.trim())
									throw new Error("A minimum version is required for automatic updates.");
								args.push(`--${values.updatePolicy}-from`, values.minimumVersion.trim());
							}
							await invoke<FXCodexPreferences>(args, "bundled");
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
				defaultValue={data.autoRename}
			/>
			<Form.Dropdown id="updatePolicy" title="Auto Update" defaultValue={policy?.channel ?? "disabled"}>
				<Form.Dropdown.Item value="disabled" title="Disabled" />
				<Form.Dropdown.Item value="patch" title="Patch" />
				<Form.Dropdown.Item value="minor" title="Minor" />
				<Form.Dropdown.Item value="major" title="Major" />
				<Form.Dropdown.Item value="latest" title="Latest Including Prereleases" />
			</Form.Dropdown>
			<Form.TextField id="minimumVersion" title="From Version" placeholder="1.2.3" defaultValue={policy?.from} />
			<Form.Description text="The selected constraint is anchored at this minimum version. Bundled invocations never self-update; this policy applies only to an external executable." />
		</Form>
	);
}

async function updateExternal(version: string | undefined, revalidate: () => void, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: "Update External fxCodex?",
			message: version
				? `Current version: ${version}. The newest compatible patch will be installed.`
				: "The newest compatible patch will be installed.",
			primaryAction: { title: "Update" },
		}))
	)
		return;
	const toast = await showToast({ style: Toast.Style.Animated, title: "Updating external fxCodex…" });
	try {
		await invoke<unknown>(["update", "--patch"], "external");
		toast.style = Toast.Style.Success;
		toast.title = "External fxCodex Updated";
		revalidate();
		onChange();
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "Update Failed";
		toast.message = error instanceof Error ? error.message : String(error);
	}
}

async function uninstallExternal(revalidate: () => void, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: "Uninstall External fxCodex?",
			message: "The executable will be removed from ~/.local/bin. Workspaces and data will remain intact.",
			primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await uninstallExternalExecutable();
	await showToast({ style: Toast.Style.Success, title: "External fxCodex Uninstalled" });
	revalidate();
	onChange();
}
