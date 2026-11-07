import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadVersion } from "../lib/client";
import {
	bundledExecutablePath,
	installExternalExecutable,
	resolveExecutable,
	selectExecutableSource,
	selectedExecutableSource,
	uninstallExternalExecutable,
} from "../lib/executable";
import { ExecutableSource } from "../lib/models";
import { capitalize, verifyChecksum } from "../lib/ui";
import { ExternalExecutableForm } from "./external-executable-form";

export function ExecutableView({ onChange }: { onChange: () => void }) {
	const { data, isLoading, revalidate } = usePromise(async () => {
		const [selected, bundled, external] = await Promise.all([
			selectedExecutableSource(),
			resolveExecutable("bundled"),
			resolveExecutable("external"),
		]);
		const [bundledVersion, externalVersion] = await Promise.all([
			bundled.isInstalled ? probeVersion("bundled") : undefined,
			external.isInstalled ? probeVersion("external") : undefined,
		]);
		return {
			selected,
			bundled,
			external,
			bundledVersion: bundledVersion?.version,
			externalVersion: externalVersion?.version,
			issues: [bundledVersion?.error, externalVersion?.error].filter((value): value is string => Boolean(value)),
		};
	}, []);

	const select = async (source: ExecutableSource) => {
		const external = data?.external ?? (await resolveExecutable("external"));
		if (source === "external" && !external.isInstalled) {
			if (
				!(await confirmAlert({
					title: "Install External fxClaude?",
					message: "fxClaude will be installed in ~/.local/bin.",
					primaryAction: { title: "Install" },
				}))
			)
				return;
			await installExternalExecutable();
		}
		await selectExecutableSource(source);
		await showToast({ style: Toast.Style.Success, title: `Using ${capitalize(source)} fxClaude` });
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
			{data && data.issues.length > 0 && (
				<List.Section title="Diagnostics">
					{data.issues.map((issue) => (
						<List.Item
							key={issue}
							title={issue}
							icon={Icon.ExclamationMark}
							actions={
								<ActionPanel>
									<Action.CopyToClipboard title="Copy Issue" content={issue} />
								</ActionPanel>
							}
						/>
					))}
				</List.Section>
			)}
		</List>
	);
}

async function probeVersion(source: ExecutableSource): Promise<{ version?: string; error?: string }> {
	try {
		return { version: (await loadVersion(source)).data.version };
	} catch (error) {
		return {
			error: `${capitalize(source)} version probe: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

async function uninstallExternal(revalidate: () => void, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: "Uninstall External fxClaude?",
			message: "The executable will be removed from ~/.local/bin. Workspaces and data will remain intact.",
			primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await uninstallExternalExecutable();
	await showToast({ style: Toast.Style.Success, title: "External fxClaude Uninstalled" });
	revalidate();
	onChange();
}
