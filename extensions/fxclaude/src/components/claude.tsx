import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadStatus } from "../lib/client";
import { ExecutableSource } from "../lib/models";
import { applicationDisplayName, filesystemPath, mutate } from "../lib/ui";

export function ClaudeView({ source, onChange }: { source: ExecutableSource; onChange: () => void }) {
	const { data, error, isLoading, revalidate } = usePromise(
		async (selectedSource: ExecutableSource) => (await loadStatus(selectedSource)).data,
		[source],
	);
	const refresh = () => {
		revalidate();
		onChange();
	};

	return (
		<List isLoading={isLoading}>
			<List.Item
				title={error ? "Claude Status Unavailable" : "Claude"}
				subtitle={error?.message ?? (data ? applicationDisplayName(data.applicationURL) : "Loading…")}
				icon={Icon.AppWindow}
				accessories={data?.applicationURL ? [{ text: filesystemPath(data.applicationURL) }] : []}
				actions={
					<ActionPanel>
						{data?.applicationURL && (
							<>
								<Action
									title="Open Primary Workspace"
									icon={Icon.Play}
									onAction={() => mutate(["open", "primary"], "Opening Claude…", refresh, source)}
								/>
								<Action.ShowInFinder title="Show in Finder" path={filesystemPath(data.applicationURL)} />
								<Action.CopyToClipboard title="Copy Path" content={filesystemPath(data.applicationURL)} />
							</>
						)}
						<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
					</ActionPanel>
				}
			/>
		</List>
	);
}
