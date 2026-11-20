import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { RequireAccount, signOut, type Account } from './account-gate.tsx';
import { md } from './format.ts';
import { APP_URL } from './urls.ts';

export default function Command() {
	return <RequireAccount>{(account) => <AccountView {...account} />}</RequireAccount>;
}
function AccountView({ profile, reload }: Account) {
	return (
		<Detail
			markdown={`# Connected to Whenever\n\n${md(profile.name)}\n\n${md(profile.email ?? '')}\n\nYour account is connected through browser sign-in. Favorites and recent links are stored locally for this connection.`}
			actions={
				<ActionPanel>
					<Action
						title="Disconnect Account"
						icon={Icon.Logout}
						style={Action.Style.Destructive}
						onAction={() => signOut(reload)}
					/>
					<Action.OpenInBrowser title="Open Whenever" url={APP_URL} />
				</ActionPanel>
			}
		/>
	);
}
