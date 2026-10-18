import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { SignInController, SignInStep } from "../../hooks/useSignIn";
import { DEFAULT_API_ORIGIN } from "../../cloud/server";

function actionTitle(step: SignInStep, busy: boolean): string {
	switch (step) {
		case "done":
			return busy ? "Opening Get TOTP…" : "Open Get TOTP";
		case "email-code":
		case "totp":
			return busy ? "Verifying Code…" : "Verify Code";
		default:
			return busy ? "Signing In…" : "Sign In";
	}
}

export function SignInForm({ signIn }: { signIn: SignInController }) {
	const { step, busy, email, setEmail, code, setCode, password, setPassword, submit, restart } = signIn;
	const title = actionTitle(step, busy);
	const canRestart = !busy && step !== "email" && step !== "done";

	return (
		<Form
			enableDrafts={false}
			isLoading={busy}
			navigationTitle="Sign In to Ente"
			actions={
				<ActionPanel>
					{busy && <Action title={title} icon={Icon.Hourglass} onAction={() => undefined} />}
					{!busy && <Action.SubmitForm title={title} onSubmit={submit} />}
					{canRestart && <Action title="Start Again" onAction={restart} />}
				</ActionPanel>
			}
		>
			{(step !== "email" || busy) && signIn.apiOrigin ? (
				<Form.Description title="Server" text={signIn.apiOrigin} />
			) : null}
			{step === "done" && <Form.Description text="Signed in. Select Open Get TOTP to view your codes." />}
			{step === "email" && (
				<Form.TextField id="email" title="Ente Email" value={email} onChange={setEmail} storeValue={false} />
			)}
			{step === "email-code" && (
				<Form.PasswordField
					id="emailCode"
					storeValue={false}
					title="Email Code"
					value={code}
					onChange={setCode}
					info="Ente requires email verification for this account. Enter the code sent to your email address."
				/>
			)}
			{step === "totp" && (
				<Form.PasswordField
					id="accountCode"
					storeValue={false}
					title="Account TOTP"
					value={code}
					onChange={setCode}
					info="Enter the TOTP code for your Ente account sign-in. Use your phone or another trusted device."
				/>
			)}
			{(step === "email" || step === "password") && (
				<Form.PasswordField
					id="password"
					storeValue={false}
					title="Ente Password"
					value={password}
					onChange={setPassword}
					info="Your password is used on this device to sign in and unlock your keys. It is not sent to Ente or saved."
				/>
			)}
			{step === "email" && !busy && (
				<Form.TextField
					id="serverURL"
					title="Server URL (optional)"
					value={signIn.serverURL}
					onChange={signIn.setServerURL}
					storeValue={false}
					placeholder={DEFAULT_API_ORIGIN}
					info="Leave empty for default. For a custom server, enter the Museum API origin, not the Auth website. Use HTTPS, or HTTP only on this device's loopback host."
				/>
			)}
		</Form>
	);
}
