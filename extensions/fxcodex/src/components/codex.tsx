import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { invoke, loadStatus } from "../lib/client";
import { ExecutableSource } from "../lib/models";
import { applicationDisplayName, filesystemPath, mutate } from "../lib/ui";

export function CodexView({ source, onChange }: { source: ExecutableSource; onChange: () => void }) {
	const { data, isLoading, revalidate } = usePromise(
		async (selectedSource: ExecutableSource) => (await loadStatus(selectedSource)).data,
		[source],
	);
	if (!data) return <List isLoading={isLoading} />;
	const status = data;
	const refresh = () => {
		revalidate();
		onChange();
	};
	const applicationName = applicationDisplayName(status.applicationURL);
	const isCodex = applicationName === "Codex";
	const targetName = isCodex ? "ChatGPT" : "Codex";
	const autoRename = status.preferences.autoRename;
	return (
		<List>
			<List.Section title="Application">
				<List.Item
					title="App"
					subtitle={applicationName}
					icon={Icon.AppWindow}
					accessories={status.applicationURL ? [{ text: filesystemPath(status.applicationURL) }] : []}
					actions={
						<ActionPanel>
							{status.applicationURL && (
								<Action.ShowInFinder title="Show in Finder" path={filesystemPath(status.applicationURL)} />
							)}
							{status.applicationURL && (
								<Action.CopyToClipboard title="Copy Path" content={filesystemPath(status.applicationURL)} />
							)}
							<Action
								title={`Rename to ${targetName}…`}
								icon={Icon.Switch}
								onAction={() => toggleApplicationName(isCodex, targetName, refresh)}
							/>
						</ActionPanel>
					}
				/>
				<List.Item
					title="Auto Rename"
					subtitle="Automatically renames ChatGPT.app to Codex.app before any command runs."
					icon={Icon.Wand}
					accessories={[
						{
							tag: {
								value: autoRename ? "Enabled" : "Disabled",
								color: autoRename ? Color.Green : Color.SecondaryText,
							},
						},
					]}
					actions={
						<ActionPanel>
							<Action
								title={autoRename ? "Disable Auto Rename" : "Enable Auto Rename"}
								icon={Icon.Switch}
								onAction={() =>
									mutate(["preferences", "set", "auto-rename", String(!autoRename)], "Updating preference…", refresh)
								}
							/>
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
}

async function toggleApplicationName(isCodex: boolean, targetName: string, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: `Rename Application to ${targetName}?`,
			message: `The application bundle in /Applications will be renamed to ${targetName}.app.`,
			primaryAction: { title: `Rename to ${targetName}` },
		}))
	)
		return;

	const toast = await showToast({ style: Toast.Style.Animated, title: `Renaming application to ${targetName}…` });
	try {
		const warnings: string[] = [];
		if (isCodex) {
			const result = await invoke<unknown>(["preferences", "set", "auto-rename", "false"]);
			warnings.push(...result.warnings.map((warning) => warning.message));
		}
		const result = await invoke<unknown>(["rename", ...(isCodex ? ["--undo"] : [])]);
		warnings.push(...result.warnings.map((warning) => warning.message));
		toast.style = Toast.Style.Success;
		toast.title = `Application Renamed to ${targetName}`;
		if (warnings.length > 0) toast.message = warnings.join("\n");
		onChange();
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "Rename Failed";
		toast.message = error instanceof Error ? error.message : String(error);
		throw error;
	}
}
