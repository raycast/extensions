import { Fragment, useCallback, useState, type ReactNode } from 'react';
import {
	Action,
	ActionPanel,
	Alert,
	Detail,
	Icon,
	List,
	Toast,
	confirmAlert,
	showToast,
} from '@raycast/api';
import type { Profile } from './api.ts';
import { accountKey, api, connect, disconnect } from './auth.ts';
import { errorMarkdown, errorMessage } from './format.ts';
import { useLoad } from './use-load.ts';
import { APP_URL } from './urls.ts';

export type Account = { key: string; profile: Profile; reload: () => void };
export async function signOut(reload: () => void) {
	if (
		!(await confirmAlert({
			title: 'Sign Out of Whenever?',
			message: 'Local favorites and recent-run links for this connection will be cleared.',
			primaryAction: { title: 'Sign Out', style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	try {
		await disconnect();
	} catch (error) {
		await showToast({
			style: Toast.Style.Failure,
			title: 'Revocation not confirmed',
			message: errorMessage(error),
		});
	} finally {
		reload();
	}
}
export function RequireAccount({ children }: { children: (account: Account) => ReactNode }) {
	const load = useCallback(async () => {
		const key = await accountKey();
		return { key, profile: await api.profile() };
	}, []);
	const state = useLoad(load);
	if (state.error) return <ConnectView error={state.error} retry={state.reload} />;
	if (!state.data) return <List isLoading searchBarPlaceholder="Loading your Whenever account…" />;
	return (
		<Fragment key={state.data.key}>{children({ ...state.data, reload: state.reload })}</Fragment>
	);
}
function ConnectView({ error, retry }: { error: unknown; retry: () => void }) {
	const [busy, setBusy] = useState(false);
	const reconnect = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await connect();
			retry();
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: 'Could not connect',
				message: errorMessage(error),
			});
		} finally {
			setBusy(false);
		}
	};
	return (
		<Detail
			isLoading={busy}
			markdown={errorMarkdown(error)}
			actions={
				<ActionPanel>
					<Action title="Connect Account" icon={Icon.Person} onAction={reconnect} />
					<Action title="Disconnect Account" icon={Icon.Logout} onAction={() => signOut(retry)} />
					<Action title="Retry Read" icon={Icon.ArrowClockwise} onAction={retry} />
					<Action.OpenInBrowser title="Open Whenever" url={APP_URL} />
				</ActionPanel>
			}
		/>
	);
}
