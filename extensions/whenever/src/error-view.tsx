import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { SignInRequired } from './api.ts';
import { errorMarkdown } from './format.ts';
import { APP_URL } from './urls.ts';

export function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
	return (
		<Detail
			markdown={errorMarkdown(
				error,
				error instanceof SignInRequired
					? 'Close and reopen the command to reconnect your account.'
					: undefined,
			)}
			actions={
				<ActionPanel>
					<Action title="Retry Read" icon={Icon.ArrowClockwise} onAction={retry} />
					<Action.OpenInBrowser title="Open Whenever" url={APP_URL} />
				</ActionPanel>
			}
		/>
	);
}
