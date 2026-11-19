import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Dashboard } from "../lib/dashboard";
import { CLIDiagnostics, collectCLIDiagnostics, collectDirectDiagnostics } from "../lib/diagnostics";
import { ExecutableView } from "./executable-view";

export function DiagnosticsView({ dashboard }: { dashboard?: Dashboard }) {
	const { data: direct, isLoading } = usePromise(
		(dashboard: Dashboard | undefined) => collectDirectDiagnostics(dashboard),
		[dashboard],
	);
	const [cli, setCLI] = useState<CLIDiagnostics>();
	const [isLoadingCLI, setIsLoadingCLI] = useState(false);
	const data = direct ? { ...direct, ...(cli ? { cli } : {}) } : undefined;
	const report = data ? JSON.stringify(data, null, 2) : "Collecting diagnostics…";
	const issueCount = dashboard?.issues.length ?? 0;
	const markdown = [
		"# Diagnostics",
		"",
		`- **Dashboard issues:** ${issueCount}`,
		`- **Selected executable:** ${direct?.executables.selected?.path ?? dashboard?.executablePath ?? "Unknown"}`,
		`- **Discovered executables:** ${direct?.executables.installations?.length ?? "Unknown"}`,
		`- **Direct storage inspection:** ${direct?.storage.error ? "Failed" : "Available"}`,
		`- **CLI status probe:** ${cli?.status ? `Exit ${cli.status.exitCode}` : isLoadingCLI ? "Running…" : "Not run"}`,
		"",
		"Diagnostics inspect executable preferences, PATH discovery, and fxcodex metadata files directly, then include separate raw CLI probes when possible.",
		"",
		"## Report",
		"",
		"```json",
		report,
		"```",
	].join("\n");
	const storageExists =
		direct?.storage.files.some((file) => file.exists) || direct?.storage.workspaces.some((file) => file.exists);

	return (
		<Detail
			isLoading={isLoading}
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy Diagnostics" content={markdown} />
					<Action.CopyToClipboard title="Copy Diagnostics JSON" content={report} />
					{direct && (
						<Action.CopyToClipboard
							title="Copy Direct Storage Diagnostics"
							content={JSON.stringify(direct.storage, null, 2)}
						/>
					)}
					<Action
						title={isLoadingCLI ? "Running CLI Diagnostics…" : cli ? "Rerun CLI Diagnostics" : "Run CLI Diagnostics"}
						icon={isLoadingCLI ? Icon.CircleProgress : Icon.Terminal}
						onAction={
							isLoadingCLI
								? undefined
								: async () => {
										setIsLoadingCLI(true);
										try {
											setCLI(await collectCLIDiagnostics());
										} finally {
											setIsLoadingCLI(false);
										}
									}
						}
					/>
					<Action.Push
						title="Manage or Install Executables…"
						icon={Icon.Download}
						target={<ExecutableView onChange={() => undefined} />}
					/>
					{direct && storageExists && (
						<Action.ShowInFinder title="Show Support Folder" path={direct.storage.supportDirectory} />
					)}
				</ActionPanel>
			}
		/>
	);
}
