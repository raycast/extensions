import { Action, ActionPanel, Detail } from "@raycast/api";

export function PasskeySignInLimit({
	onChangeAccount,
	apiOrigin,
}: {
	onChangeAccount: () => void;
	apiOrigin?: string;
}) {
	return (
		<Detail
			navigationTitle="Sign In to Ente"
			metadata={
				apiOrigin ? (
					<Detail.Metadata>
						<Detail.Metadata.Label title="Server" text={apiOrigin} />
					</Detail.Metadata>
				) : undefined
			}
			markdown={
				"# Passkey sign-in is not supported here\n\nThis Ente requires a passkey check that Raycast cannot complete.\n\nEnable account TOTP in Ente, then start sign-in again. You can keep passkeys enabled when you use TOTP.\n\nIf you cannot use TOTP, remove all passkeys in Ente, sign in here, then add a passkey again."
			}
			actions={
				<ActionPanel>
					<Action title="Use Another Account" onAction={onChangeAccount} />
				</ActionPanel>
			}
		/>
	);
}
