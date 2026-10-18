import { ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { ReactNode } from "react";
import { TOTPState } from "../cloud/model";
import { formatLastSync } from "../helpers/sync-time";
import { JsonFormat } from "../helpers/types";
import { useCodeIcons } from "../hooks/useCodeIcons";
import { CodeListItem } from "./CodeListItem";

export interface CodeListProps {
	items: JsonFormat[];
	state: TOTPState;
	managementActions: ReactNode;
}

function emptyDescription(state: TOTPState, lastSync: string): string {
	if (state.error) {
		return state.error;
	}

	if (state.mode === "import") {
		return 'Run "Import Secrets" to load entries with the Ente CLI. Or sign in to Ente for auto-sync.';
	}

	if (state.status === "Sign-in required") {
		return "Sign in to Ente. Or use Import Secrets.";
	}

	return `Last successful sync: ${lastSync}`;
}

function emptyTitle(state: TOTPState): string {
	if (state.loading) {
		return "Loading entries";
	}

	if (state.mode === "cloud" && state.status === "Sign-in required") {
		return "Sign in to Ente";
	}

	return "No entries found";
}

export function CodeList({ items, state, managementActions }: CodeListProps) {
	const {
		data: rankedItems,
		visitItem,
		resetRanking,
	} = useFrecencySorting(items, {
		key: (item) => item.service_name,
	});
	const { refreshIcons } = useCodeIcons(items);
	const cloud = state.mode === "cloud";
	const status = cloud ? state.status : "Import mode";
	const lastSync = formatLastSync(state.lastSyncedAt);
	const preferredAction = getPreferenceValues<Preferences>().primaryAction;

	return (
		<List
			navigationTitle={cloud && state.apiOrigin ? `Get TOTP — ${state.apiOrigin}` : "Get TOTP"}
			isLoading={state.loading || state.status === "Syncing"}
			searchBarPlaceholder="Search accounts..."
			isShowingDetail
		>
			{items.length === 0 && (
				<List.EmptyView
					title={emptyTitle(state)}
					description={emptyDescription(state, lastSync)}
					actions={<ActionPanel>{managementActions}</ActionPanel>}
				/>
			)}
			<List.Section title={status} subtitle={cloud ? `Last sync: ${lastSync}` : undefined}>
				{rankedItems.map((item, index) => (
					<CodeListItem
						key={item.id ?? index}
						item={item}
						state={state}
						lastSync={lastSync}
						primaryAction={preferredAction}
						managementActions={managementActions}
						onVisit={() => visitItem(item)}
						onResetRanking={() => resetRanking(item)}
						onRefreshIcons={refreshIcons}
					/>
				))}
			</List.Section>
		</List>
	);
}
