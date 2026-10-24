import { Detail } from "@raycast/api";
import { PasskeySignInLimit } from "./components/sign-in/PasskeySignInLimit";
import { SignInForm } from "./components/sign-in/SignInForm";
import { SignInStatus } from "./components/sign-in/SignInStatus";
import { useSignIn } from "./hooks/useSignIn";

export default function Command() {
	const signIn = useSignIn();

	if (signIn.step === "checking") {
		return <Detail navigationTitle="Sign In to Ente" isLoading markdown="" />;
	}

	if (signIn.step === "passkey") {
		return <PasskeySignInLimit onChangeAccount={signIn.changeAccount} apiOrigin={signIn.apiOrigin} />;
	}

	if (signIn.step === "signed-in" || signIn.step === "session-error") {
		return (
			<SignInStatus
				signedIn={signIn.step === "signed-in"}
				busy={signIn.busy}
				error={signIn.sessionError}
				apiOrigin={signIn.apiOrigin}
				onOpenCodes={signIn.openTOTP}
				onRetry={signIn.retrySession}
				onSignOut={signIn.signOut}
			/>
		);
	}

	return <SignInForm signIn={signIn} />;
}
