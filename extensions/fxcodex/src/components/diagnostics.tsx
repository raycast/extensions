import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Dashboard } from "../lib/dashboard";
import { resolveExecutable, verifyBundledChecksum } from "../lib/executable";
import { capitalize, filesystemPath, verifyChecksum } from "../lib/ui";

export function DiagnosticsView({ dashboard }: { dashboard: Dashboard }) {
	const { data, isLoading } = usePromise(async () => {
		const [bundled, external, checksum] = await Promise.all([
			resolveExecutable("bundled"),
			resolveExecutable("external"),
			verifyBundledChecksum(),
		]);
		return { bundled, external, checksum };
	}, []);
	const markdown = `# Diagnostics\n\n- **Machine API:** 1\n- **Selected source:** ${capitalize(dashboard.source)}\n- **Selected version:** ${dashboard.version}\n- **Bundled checksum:** ${data?.checksum ? "Valid" : "Invalid"}\n- **Bundled path:** ${data?.bundled.path ?? "Loading…"}\n- **External path:** ${data?.external.isInstalled ? data.external.path : "Not installed"}\n- **Support folder:** ${dashboard.status.supportDirectoryURL}\n\n## Raw Status\n\n\`\`\`json\n${JSON.stringify(dashboard.status, null, 2)}\n\`\`\``;
	return (
		<Detail
			isLoading={isLoading}
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy Diagnostics" content={markdown} />
					<Action.CopyToClipboard title="Copy Raw JSON" content={JSON.stringify(dashboard.status, null, 2)} />
					<Action title="Verify Bundled Executable" onAction={verifyChecksum} />
					<Action.ShowInFinder
						title="Show Support Folder"
						path={filesystemPath(dashboard.status.supportDirectoryURL)}
					/>
				</ActionPanel>
			}
		/>
	);
}
