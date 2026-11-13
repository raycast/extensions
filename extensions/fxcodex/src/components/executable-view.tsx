import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadVersion } from "../lib/client";
import {
	ExecutableInstallation,
	forgetExecutable,
	listExecutables,
	selectExecutableSource,
	uninstallExecutable,
	updateHomebrewExecutable,
} from "../lib/executable";
import { ExternalExecutableForm } from "./external-executable-form";
import { InstallExecutableView } from "./install-executable-view";
import { PreferencesForm } from "./preferences-form";

interface ProbedInstallation extends ExecutableInstallation {
	probedVersion?: string;
	probeError?: string;
}

export function ExecutableView({ onChange }: { onChange: () => void }) {
	const { data, isLoading, revalidate } = usePromise(async () => {
		const installations = await listExecutables();
		return Promise.all(
			installations.map(async (installation): Promise<ProbedInstallation> => {
				if (!installation.isInstalled) return installation;
				try {
					return { ...installation, probedVersion: (await loadVersion(installation.path)).data.version };
				} catch (error) {
					return {
						...installation,
						probeError: error instanceof Error ? error.message : String(error),
					};
				}
			}),
		);
	}, []);
	const refresh = () => {
		revalidate();
		onChange();
	};

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search installed executables…">
			<List.Section title="Preferences">
				<List.Item
					title="fxCodex Preferences"
					subtitle="Application naming and terminal auto-update policy"
					icon={Icon.Gear}
					actions={
						<ActionPanel>
							<Action.Push title="Manage Preferences" target={<PreferencesForm onChange={refresh} />} />
						</ActionPanel>
					}
				/>
			</List.Section>
			<List.Section title="Executables">
				<List.Item
					id="install-executable"
					title="Install fxCodex…"
					subtitle="Choose a GitHub release and installation destination"
					icon={Icon.Download}
					actions={
						<ActionPanel>
							<Action.Push
								title="Browse Releases…"
								icon={Icon.Download}
								target={<InstallExecutableView onChange={refresh} />}
							/>
							<Action.Push
								title="Choose Existing Executable…"
								icon={Icon.Finder}
								target={<ExternalExecutableForm onChange={refresh} />}
							/>
						</ActionPanel>
					}
				/>
				{(data ?? []).map((installation) => (
					<ExecutableItem key={installation.path} installation={installation} onChange={refresh} />
				))}
				{!isLoading && data?.length === 0 && (
					<List.Item
						title="No fxCodex Executable Found"
						subtitle="Checked PATH, ~/.local/bin, /opt/homebrew/bin, and /usr/local/bin"
						icon={Icon.ExclamationMark}
						actions={
							<ActionPanel>
								<Action.Push title="Install FxCodex…" target={<InstallExecutableView onChange={refresh} />} />
								<Action.Push
									title="Choose Existing Executable…"
									target={<ExternalExecutableForm onChange={refresh} />}
								/>
							</ActionPanel>
						}
					/>
				)}
			</List.Section>
		</List>
	);
}

function ExecutableItem({ installation, onChange }: { installation: ProbedInstallation; onChange: () => void }) {
	const version = installation.probedVersion ?? installation.version;
	const accessories = [
		...(installation.isSelected ? [{ tag: { value: "Selected", color: Color.Green } }] : []),
		...(installation.probeError ? [{ tag: { value: "Probe Failed", color: Color.Orange } }] : []),
		...(installation.isSymbolicLink
			? [
					{
						icon: Icon.Link,
						tooltip: installation.resolvedPath ? `Links to ${installation.resolvedPath}` : "Symbolic link",
					},
				]
			: []),
		...(version ? [{ text: version }] : []),
	];
	return (
		<List.Item
			title={installation.location}
			subtitle={
				installation.isInstalled
					? installation.probeError
						? `Probe failed · ${installation.path}`
						: installation.path
					: `Missing · ${installation.path}`
			}
			icon={installation.isInstalled && !installation.probeError ? Icon.Terminal : Icon.ExclamationMark}
			accessories={accessories}
			actions={
				<ActionPanel>
					{installation.isInstalled && !installation.isSelected && (
						<Action
							title="Use This Executable"
							icon={Icon.CheckCircle}
							onAction={() => select(installation, onChange)}
						/>
					)}
					<Action.Push
						title="Install Another Version…"
						icon={Icon.Download}
						target={<InstallExecutableView onChange={onChange} />}
					/>
					{installation.managed && installation.method === "direct" && installation.destination !== "extension" && (
						<Action.Push
							title="Replace with Another Version…"
							icon={Icon.ArrowClockwise}
							target={<InstallExecutableView replacement={installation} onChange={onChange} />}
						/>
					)}
					{installation.destination === "homebrew" && (
						<Action title="Update with Homebrew" icon={Icon.ArrowClockwise} onAction={() => updateBrew(onChange)} />
					)}
					<Action.Push
						title="Choose Existing Executable…"
						icon={Icon.Finder}
						target={<ExternalExecutableForm onChange={onChange} />}
					/>
					{installation.isInstalled && <Action.ShowInFinder title="Show in Finder" path={installation.path} />}
					{installation.resolvedPath && (
						<Action.ShowInFinder title="Show Original in Finder" icon={Icon.Link} path={installation.resolvedPath} />
					)}
					<Action.CopyToClipboard title="Copy Executable Path" content={installation.path} />
					{installation.managed && (
						<Action
							title="Uninstall…"
							icon={Icon.Trash}
							style={Action.Style.Destructive}
							onAction={() => uninstall(installation, onChange)}
						/>
					)}
					{installation.isRegistered && !installation.managed && (
						<Action
							title="Forget Executable"
							icon={Icon.XMarkCircle}
							onAction={async () => {
								await forgetExecutable(installation.path);
								onChange();
							}}
						/>
					)}
					{installation.probeError && (
						<Action.CopyToClipboard title="Copy Probe Error" content={installation.probeError} />
					)}
				</ActionPanel>
			}
		/>
	);
}

async function select(installation: ProbedInstallation, onChange: () => void) {
	await selectExecutableSource(installation.path);
	await showToast({
		style: Toast.Style.Success,
		title: `Using fxCodex ${installation.probedVersion ?? installation.version ?? "Executable"}`,
		message: installation.path,
	});
	onChange();
}

async function updateBrew(onChange: () => void) {
	const toast = await showToast({ style: Toast.Style.Animated, title: "Updating fxCodex with Homebrew…" });
	try {
		const path = await updateHomebrewExecutable();
		toast.style = Toast.Style.Success;
		toast.title = "Homebrew fxCodex Updated";
		toast.message = path;
		onChange();
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "Homebrew Update Failed";
		toast.message = error instanceof Error ? error.message : String(error);
	}
}

async function uninstall(installation: ProbedInstallation, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: `Uninstall fxCodex${installation.probedVersion ? ` ${installation.probedVersion}` : ""}?`,
			message:
				installation.method === "homebrew"
					? "Homebrew will uninstall its fxcodex formula. Workspaces and data will remain intact."
					: `${installation.path}\n\nWorkspaces and data will remain intact.`,
			primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	const toast = await showToast({ style: Toast.Style.Animated, title: "Uninstalling fxCodex…" });
	try {
		await uninstallExecutable(installation.path);
		toast.style = Toast.Style.Success;
		toast.title = "fxCodex Uninstalled";
		onChange();
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "Uninstall Failed";
		toast.message = error instanceof Error ? error.message : String(error);
	}
}
