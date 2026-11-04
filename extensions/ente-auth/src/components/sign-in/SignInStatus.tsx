import { Action, ActionPanel, Detail, Icon, popToRoot } from "@raycast/api";

interface SignInStatusProps {
	signedIn: boolean;
	busy: boolean;
	error: string;
	apiOrigin?: string;
	onOpenCodes: () => Promise<void>;
	onRetry: () => Promise<void>;
	onSignOut: () => Promise<void>;
}

export function SignInStatus({
	signedIn,
	busy,
	error,
	apiOrigin,
	onOpenCodes,
	onRetry,
	onSignOut,
}: SignInStatusProps) {
	const markdown = signedIn
		? '**Already signed in**\n\nSign out to use another account. Open "Get TOTP" to view your codes.'
		: `**Session could not be read**\n\n${error}\n\nRetry, or sign out to start again.`;

	return (
		<Detail
			navigationTitle="Sign In to Ente"
			isLoading={busy}
			markdown={markdown}
			metadata={
				apiOrigin ? (
					<Detail.Metadata>
						<Detail.Metadata.Label title="Server" text={apiOrigin} />
					</Detail.Metadata>
				) : undefined
			}
			actions={
				<ActionPanel>
					{!busy && (
						<>
							{signedIn ? (
								<Action title="Open Get TOTP" icon={Icon.Key} onAction={onOpenCodes} />
							) : (
								<Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
							)}
							<Action
								title="Sign Out"
								icon={Icon.Logout}
								style={Action.Style.Destructive}
								onAction={onSignOut}
							/>
							<Action title="Back to Raycast" icon={Icon.ArrowLeft} onAction={() => popToRoot()} />
						</>
					)}
				</ActionPanel>
			}
		/>
	);
}
