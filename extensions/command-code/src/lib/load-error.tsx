import {Action, ActionPanel, Icon, List} from '@raycast/api';
import type {ReactElement} from 'react';
import {hasAppData} from './data';

const DOWNLOAD_URL = 'https://commandcode.ai/download';

/** Stops the raw error toast: LoadError already tells the user what to do. */
export function ignoreLoadError(): void {}

/** No app data means the app was never opened; anything else is a bad read. */
export function LoadError(): ReactElement {
	const installed = hasAppData();
	return (
		<List>
			<List.EmptyView
				icon={Icon.ExclamationMark}
				title={
					installed ? 'Could not read Command Code' : 'Command Code not found'
				}
				description={
					installed
						? 'Update the Command Code desktop app and this extension, then try again.'
						: 'Install the Command Code desktop app and open it once, then try again.'
				}
				actions={
					installed ? undefined : (
						<ActionPanel>
							<Action.OpenInBrowser
								title="Download Command Code"
								url={DOWNLOAD_URL}
							/>
						</ActionPanel>
					)
				}
			/>
		</List>
	);
}
