import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon, getProgressIcon } from "@raycast/utils";
import { ReactNode } from "react";
import { TOTPState } from "../cloud/model";
import { getIconPath } from "../helpers/icons";
import { JsonFormat } from "../helpers/types";
import { CodeDetails } from "./CodeDetails";

interface CodeListItemProps {
	item: JsonFormat;
	state: TOTPState;
	lastSync: string;
	primaryAction: Preferences["primaryAction"];
	managementActions: ReactNode;
	onVisit: () => unknown;
	onResetRanking: () => unknown;
	onRefreshIcons: () => Promise<void>;
}

function codeIcon(item: JsonFormat) {
	const cached = getIconPath(item.service_name);
	if (cached) {
		return { source: cached };
	}

	if (/^https?:\/\//.test(item.notes)) {
		return getFavicon(item.notes);
	}

	return Icon.Key;
}

export function CodeListItem({
	item,
	state,
	lastSync,
	primaryAction,
	managementActions,
	onVisit,
	onResetRanking,
	onRefreshIcons,
}: CodeListItemProps) {
	const copy = (
		<Action.CopyToClipboard
			key="copy"
			title="Copy Current"
			icon={Icon.Key}
			content={item.current_totp}
			onCopy={onVisit}
		/>
	);
	const paste = (
		<Action.Paste
			key="paste"
			title="Paste Current"
			icon={Icon.Key}
			content={item.current_totp}
			onPaste={onVisit}
		/>
	);

	return (
		<List.Item
			id={item.id}
			title={item.service_name || item.username || "TOTP"}
			subtitle={item.username}
			icon={codeIcon(item)}
			keywords={[item.service_name, item.username ?? "", ...item.tags]}
			detail={<CodeDetails item={item} state={state} lastSync={lastSync} />}
			accessories={[
				{
					icon: {
						source: getProgressIcon(item.current_totp_time_remaining / Number(item.period)),
						// Ente colors - purple #A400B6, orange #FF9800
						tintColor: item.current_totp_time_remaining > 10 ? "#A400B6" : "#FF9800",
					},
				},
			]}
			actions={
				<ActionPanel>
					<ActionPanel.Section title="Current">
						{primaryAction === "copy" ? [copy, paste] : [paste, copy]}
					</ActionPanel.Section>
					<ActionPanel.Section title="Next">
						<Action.CopyToClipboard
							title="Copy Next"
							icon={Icon.Key}
							content={item.next_totp}
							onCopy={onVisit}
							shortcut={Keyboard.Shortcut.Common.New}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section>
						<Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={onResetRanking} />
						<Action
							title="Refresh Icons"
							icon={Icon.Image}
							shortcut={state.mode === "cloud" ? undefined : Keyboard.Shortcut.Common.Refresh}
							onAction={onRefreshIcons}
						/>
					</ActionPanel.Section>
					{managementActions}
				</ActionPanel>
			}
		/>
	);
}
