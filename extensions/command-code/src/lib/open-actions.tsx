import {Action, ActionPanel, Color, Icon, type List} from '@raycast/api';
import type {ReactElement} from 'react';

export const MISSING_TAG: List.Item.Accessory = {
	tag: {value: 'Folder Missing', color: Color.Orange},
	tooltip: 'This folder no longer exists.',
};

interface OpenActionsProps {
	readonly path: string;
	readonly target: string;
	readonly folderMissing: boolean;
}

/** The app drops a link to a missing folder, so only the path stays useful. */
export function OpenActions({
	path,
	target,
	folderMissing,
}: OpenActionsProps): ReactElement {
	const copyPath = (
		<Action.CopyToClipboard title="Copy Project Path" content={path} />
	);
	if (folderMissing) return <ActionPanel>{copyPath}</ActionPanel>;
	return (
		<ActionPanel>
			<Action.Open
				title="Open in Command Code"
				icon={Icon.AppWindow}
				target={target}
			/>
			<Action.ShowInFinder path={path} />
			{copyPath}
		</ActionPanel>
	);
}
