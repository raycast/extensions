import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
	finishSignIn,
	getSession,
	signInWithPassword,
	signOut,
	verifyEmail,
	verifyTOTP,
} from "../cloud/auth";
import { CloudError, safeMessage } from "../cloud/errors";
import { Authorization, PasswordKey, SignInContext } from "../cloud/types";
import { DEFAULT_API_ORIGIN, normalizeAPIOrigin } from "../cloud/server";

export type SignInStep =
	| "checking"
	| "signed-in"
	| "session-error"
	| "email"
	| "email-code"
	| "totp"
	| "passkey"
	| "password"
	| "done";

export function useSignIn() {
	const [step, setStep] = useState<SignInStep>("checking");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const inFlight = useRef(false);
	const [authorization, setAuthorization] = useState<Authorization>();
	const [sessionError, setSessionError] = useState("");
	const context = useRef<SignInContext | undefined>(undefined);
	const [serverURL, setServerDraft] = useState("");
	const [apiOrigin, setAPIOrigin] = useState<string>();
	const controller = useRef(new AbortController());
	const passwordKey = useRef<PasswordKey | undefined>(undefined);

	function clearPasswordKey() {
		passwordKey.current?.key.fill(0);
		passwordKey.current = undefined;
	}

	function setServerURL(value: string) {
		if (!inFlight.current && !context.current) {
			setServerDraft(value);
		}
	}

	function requireContext(): SignInContext {
		if (!context.current) {
			throw new CloudError("verification", "Start sign-in again.");
		}
		return context.current;
	}

	useEffect(() => {
		const current = new AbortController();
		controller.current = current;
		void checkSession(current.signal);

		return () => {
			current.abort();
			clearPasswordKey();
		};
	}, []);

	async function checkSession(signal: AbortSignal) {
		setStep("checking");
		setSessionError("");

		try {
			const session = await getSession();
			if (!signal.aborted) {
				setAPIOrigin(session?.apiOrigin);
				setStep(session ? "signed-in" : "email");
			}
		} catch (error) {
			if (!signal.aborted) {
				setSessionError(safeMessage(error));
				setStep("session-error");
			}
		}
	}

	async function signOutAndReset() {
		if (inFlight.current) {
			return;
		}

		inFlight.current = true;
		setBusy(true);

		try {
			await signOut();
			if (!controller.current.signal.aborted) {
				reset();
				setServerDraft("");
				setEmail("");
				await showToast({ style: Toast.Style.Success, title: "Signed out" });
			}
		} catch (error) {
			if (!controller.current.signal.aborted) {
				await showToast({
					style: Toast.Style.Failure,
					title: "Sign-out failed",
					message: safeMessage(error),
				});
			}
		} finally {
			inFlight.current = false;
			if (!controller.current.signal.aborted) {
				setBusy(false);
			}
		}
	}

	async function acceptAuthorization(result: Authorization) {
		setCode("");
		setAuthorization(result);

		if (result.twoFactorSessionID || result.twoFactorSessionIDV2) {
			setStep("totp");
			return;
		}

		if (result.passkeySessionID) {
			clearPasswordKey();
			setPassword("");
			setStep("passkey");
			return;
		}

		await completeSignIn(result);
	}

	async function completeSignIn(result: Authorization) {
		try {
			await finishSignIn(requireContext(), result, password, controller.current.signal, passwordKey.current);
			if (!controller.current.signal.aborted) {
				setPassword("");
				setAuthorization(undefined);
				setStep("done");
				await openTOTP(true);
			}
		} catch (error) {
			if (!controller.current.signal.aborted) {
				setStep("password");
			}

			throw error;
		} finally {
			clearPasswordKey();
		}
	}

	async function openTOTP(afterSignIn = false) {
		try {
			await launchCommand({
				name: "index",
				type: LaunchType.UserInitiated,
				...(afterSignIn ? { context: { signedIn: true } } : {}),
			});
		} catch {
			if (!controller.current.signal.aborted) {
				await showToast({
					style: Toast.Style.Failure,
					title: afterSignIn ? "Signed in, but Get TOTP could not open" : "Get TOTP could not open",
					message: "Try Open Get TOTP again, or open it from Raycast search.",
				});
			}
		}
	}

	async function submitCredentials(signal: AbortSignal) {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			throw new CloudError("verification", "Enter a valid email address.");
		}

		requirePassword();
		const origin = normalizeAPIOrigin(serverURL.trim() ? serverURL : DEFAULT_API_ORIGIN);
		setAPIOrigin(origin);
		clearPasswordKey();

		const result = await signInWithPassword(email, password, origin, signal);
		passwordKey.current = result.passwordKey;
		if (signal.aborted) {
			clearPasswordKey();
			return;
		}

		context.current = { id: result.id, apiOrigin: origin };
		if (result.passwordKey) {
			setPassword("");
		}

		if (result.authorization) {
			await acceptAuthorization(result.authorization);
		} else {
			setStep("email-code");
		}
	}

	async function submitCode(signal: AbortSignal) {
		if (!/^\d{6}$/.test(code.trim())) {
			throw new CloudError("verification", "Enter the six-digit verification code.");
		}

		const result =
			step === "email-code"
				? await verifyEmail(requireContext(), email, code, signal)
				: await verifyTOTP(requireContext(), requireAuthorization(), code, signal);

		if (!signal.aborted) {
			await acceptAuthorization(result);
		}
	}

	function requirePassword() {
		if (!password) {
			throw new CloudError("verification", "Enter your Ente password.");
		}
	}

	function requireAuthorization(): Authorization {
		if (!authorization) {
			throw new CloudError("verification", "Start sign-in again.");
		}

		return authorization;
	}

	function reset() {
		clearPasswordKey();
		context.current = undefined;
		setAPIOrigin(undefined);
		setAuthorization(undefined);
		setPassword("");
		setCode("");
		setSessionError("");
		setStep("email");
	}

	function restart() {
		if (!inFlight.current) {
			reset();
		}
	}

	function changeAccount() {
		if (!inFlight.current) {
			reset();
			setEmail("");
		}
	}

	async function submit() {
		if (inFlight.current) {
			return;
		}

		inFlight.current = true;
		setBusy(true);

		try {
			const signal = controller.current.signal;
			switch (step) {
				case "email":
					await submitCredentials(signal);
					break;
				case "email-code":
				case "totp":
					await submitCode(signal);
					break;
				case "password":
					requirePassword();
					await completeSignIn(requireAuthorization());
					break;
				case "done":
					await openTOTP(true);
					break;
			}
		} catch (error) {
			if (!controller.current.signal.aborted) {
				await showToast({ style: Toast.Style.Failure, title: "Sign-in failed", message: safeMessage(error) });
			}
		} finally {
			inFlight.current = false;
			if (!controller.current.signal.aborted) {
				setBusy(false);
			}
		}
	}

	return {
		step,
		busy,
		email,
		setEmail,
		code,
		setCode,
		password,
		serverURL,
		setServerURL,
		apiOrigin,
		setPassword,
		sessionError,
		submit,
		restart,
		changeAccount,
		signOut: signOutAndReset,
		retrySession: () => checkSession(controller.current.signal),
		openTOTP: () => openTOTP(),
	};
}

export type SignInController = ReturnType<typeof useSignIn>;
