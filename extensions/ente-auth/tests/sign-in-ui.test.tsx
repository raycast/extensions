/** @jest-environment jsdom */
import { LaunchType, launchCommand, popToRoot, showToast, Toast } from "@raycast/api";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
	finishSignIn,
	getSession,
	signInWithPassword,
	signOut,
	verifyEmail,
	verifyTOTP,
} from "../src/cloud/auth";
import { useSignIn } from "../src/hooks/useSignIn";
import SignIn from "../src/sign-in";
import { deferred } from "./deferred";

jest.mock("@raycast/api", () => ({
	...jest.requireActual("@raycast/api"),
	...jest.requireActual("./raycast-ui"),
	launchCommand: jest.fn(),
	popToRoot: jest.fn(),
	LaunchType: { UserInitiated: "userInitiated" },
}));
jest.mock("../src/cloud/auth", () => ({
	finishSignIn: jest.fn(),
	getSession: jest.fn(),
	signOut: jest.fn(),
	signInWithPassword: jest.fn(),
	verifyEmail: jest.fn(),
	verifyTOTP: jest.fn(),
}));

const PASSWORD = "test";
const CONTEXT = { id: "attempt", apiOrigin: "https://api.ente.com" };
function passwordKey() {
	return { key: new Uint8Array(32).fill(7), kekSalt: "salt", memLimit: 8192, opsLimit: 1 };
}

function field(title: string, value: string) {
	fireEvent.change(screen.getByLabelText(title), { target: { value } });
}

async function click(title: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: title }));
	});
}

async function openForm() {
	const view = render(<SignIn />);
	await screen.findByLabelText("Ente Email");
	field("Ente Email", "test@example.com");
	field("Ente Password", PASSWORD);
	return view;
}

beforeEach(() => {
	jest.resetAllMocks();
	(launchCommand as jest.Mock).mockResolvedValue(undefined);
	(popToRoot as jest.Mock).mockResolvedValue(undefined);
	(showToast as jest.Mock).mockResolvedValue({});
	(getSession as jest.Mock).mockResolvedValue(null);
	(finishSignIn as jest.Mock).mockResolvedValue({ id: "saved-session" });
	(signOut as jest.Mock).mockResolvedValue(undefined);
	(signInWithPassword as jest.Mock).mockResolvedValue({
		id: "attempt",
		authorization: { id: 123 },
		passwordKey: passwordKey(),
	});
	(verifyEmail as jest.Mock).mockResolvedValue({ id: 123 });
	(verifyTOTP as jest.Mock).mockResolvedValue({ id: 123 });
});

describe("sign-in form", () => {
	it("keeps the submitted server fixed during pending work and verification", async () => {
		const pending = deferred<unknown>();
		(signInWithPassword as jest.Mock).mockReturnValueOnce(pending.promise);
		const { result } = renderHook(() => useSignIn());
		await waitFor(() => expect(result.current.step).toBe("email"));
		act(() => {
			result.current.setEmail("test@example.com");
			result.current.setPassword(PASSWORD);
			result.current.setServerURL("HTTPS://API.EXAMPLE.COM:443/");
		});
		const edit = result.current.setServerURL;
		await act(async () => {
			void result.current.submit();
		});
		act(() => edit("https://other.example.com"));
		expect(result.current.serverURL).toBe("HTTPS://API.EXAMPLE.COM:443/");
		expect(result.current.apiOrigin).toBe("https://api.example.com");
		await act(async () => pending.resolve({ id: "attempt", apiOrigin: "https://api.example.com" }));
		act(() => edit("https://other.example.com"));
		act(() => result.current.setCode("123456"));
		await act(async () => result.current.submit());
		expect(verifyEmail).toHaveBeenCalledWith(
			{ id: "attempt", apiOrigin: "https://api.example.com" },
			"test@example.com",
			"123456",
			expect.any(AbortSignal)
		);
	});

	it("does not start authentication for an invalid server", async () => {
		await openForm();
		field("Server URL (optional)", "http://remote.example.com");
		await click("Sign In");
		expect(signInWithPassword).not.toHaveBeenCalled();
		expect(screen.getByLabelText("Server URL (optional)").getAttribute("data-store-value")).toBe("false");
	});

	it("keeps the server draft on restart and uses a new origin only after restart", async () => {
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({
			id: "attempt",
			apiOrigin: "https://a.example.com",
		});
		await openForm();
		field("Server URL (optional)", "https://a.example.com/");
		await click("Sign In");
		expect(screen.queryByLabelText("Server URL (optional)")).toBeNull();
		expect(screen.getByRole("region", { name: "Server" }).textContent).toContain("https://a.example.com");
		await click("Start Again");
		expect((screen.getByLabelText("Server URL (optional)") as HTMLInputElement).value).toBe(
			"https://a.example.com/"
		);
		expect((screen.getByLabelText("Ente Email") as HTMLInputElement).value).toBe("test@example.com");
		expect((screen.getByLabelText("Ente Password") as HTMLInputElement).value).toBe("");
		field("Server URL (optional)", "https://b.example.com");
		field("Ente Password", PASSWORD);
		await click("Sign In");
		expect(signInWithPassword).toHaveBeenLastCalledWith(
			"test@example.com",
			PASSWORD,
			"https://b.example.com",
			expect.any(AbortSignal)
		);
	});

	it("shows a saved server as plain metadata and clears it on sign-out", async () => {
		(getSession as jest.Mock).mockResolvedValueOnce({ id: "saved", apiOrigin: "https://api.example.com" });
		render(<SignIn />);
		await screen.findByText(/Already signed in/);
		expect(screen.getByRole("region", { name: "Server" }).textContent).toContain("https://api.example.com");
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.queryByLabelText("Server URL (optional)")).toBeNull();
		await click("Sign Out");
		expect((screen.getByLabelText("Server URL (optional)") as HTMLInputElement).value).toBe("");
		expect(screen.queryByRole("region", { name: "Server" })).toBeNull();
	});
	it("shows email and password together without saving either field", async () => {
		await openForm();
		for (const title of ["Ente Email", "Ente Password", "Server URL (optional)"]) {
			expect(screen.getByLabelText(title).getAttribute("data-store-value")).toBe("false");
		}
		expect(screen.getByLabelText("Server URL (optional)").getAttribute("placeholder")).toBe(
			CONTEXT.apiOrigin
		);
		expect(screen.getByRole("region", { name: "Sign In to Ente" }).getAttribute("data-enable-drafts")).toBe(
			"false"
		);
	});

	it("shows email, password, then the optional server URL", async () => {
		const { container } = await openForm();
		expect(Array.from(container.querySelectorAll("input"), (input) => input.id)).toEqual([
			"email",
			"password",
			"serverURL",
		]);
	});

	it.each([
		["Ente Email", "invalid", "Enter a valid email address."],
		["Ente Password", "", "Enter your Ente password."],
	])("checks %s before starting sign-in", async (title, value, message) => {
		await openForm();
		field(title, value);
		await click("Sign In");
		expect(signInWithPassword).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Failure, title: "Sign-in failed", message });
	});

	it("opens codes after password sign-in and clears the derived key", async () => {
		const key = passwordKey();
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({
			id: "attempt",
			authorization: { id: 123 },
			passwordKey: key,
		});
		await openForm();
		await click("Sign In");
		expect(signInWithPassword).toHaveBeenCalledWith(
			"test@example.com",
			PASSWORD,
			CONTEXT.apiOrigin,
			expect.any(AbortSignal)
		);
		expect(finishSignIn).toHaveBeenCalledTimes(1);
		expect(launchCommand).toHaveBeenCalledWith({
			name: "index",
			type: LaunchType.UserInitiated,
			context: { signedIn: true },
		});
		expect(key.key.every((byte) => byte === 0)).toBe(true);
		expect(screen.queryByLabelText("Ente Password")).toBeNull();
		expect(screen.queryByLabelText("Email Code")).toBeNull();
	});

	it("keeps the entered password until required email verification finishes", async () => {
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({ id: "attempt" });
		await openForm();
		await click("Sign In");
		expect(screen.getByLabelText("Email Code")).not.toBeNull();
		expect(finishSignIn).not.toHaveBeenCalled();
		field("Email Code", "12345");
		await click("Verify Code");
		expect(verifyEmail).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Enter the six-digit verification code.",
			})
		);
		field("Email Code", "123456");
		await click("Verify Code");
		expect(verifyEmail).toHaveBeenCalledWith(CONTEXT, "test@example.com", "123456", expect.any(AbortSignal));
		expect(finishSignIn).toHaveBeenCalledWith(
			CONTEXT,
			{ id: 123 },
			PASSWORD,
			expect.any(AbortSignal),
			undefined
		);
		expect(launchCommand).toHaveBeenCalledTimes(1);
	});

	it.each([{ twoFactorSessionID: "totp" }, { passkeySessionID: "passkey", twoFactorSessionIDV2: "totp" }])(
		"uses account TOTP and keeps the key through an incorrect code: %j",
		async (challenge) => {
			const key = passwordKey();
			(signInWithPassword as jest.Mock).mockResolvedValueOnce({
				id: "attempt",
				authorization: { id: 123, ...challenge },
				passwordKey: key,
			});
			(verifyTOTP as jest.Mock).mockRejectedValueOnce(new Error("incorrect code"));
			await openForm();
			await click("Sign In");
			expect(screen.queryByLabelText("Ente Password")).toBeNull();
			field("Account TOTP", "123456");
			await click("Verify Code");
			expect(key.key.every((byte) => byte === 7)).toBe(true);
			expect(finishSignIn).not.toHaveBeenCalled();
			await click("Verify Code");
			expect(finishSignIn).toHaveBeenCalledWith(CONTEXT, { id: 123 }, "", expect.any(AbortSignal), key);
			expect(key.key.every((byte) => byte === 0)).toBe(true);
			expect(launchCommand).toHaveBeenCalledTimes(1);
		}
	);

	it("lets the user correct an unlock password without sending another email code", async () => {
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({ id: "attempt" });
		(finishSignIn as jest.Mock).mockRejectedValueOnce(new Error("wrong password"));
		await openForm();
		await click("Sign In");
		field("Email Code", "123456");
		await click("Verify Code");
		expect(launchCommand).not.toHaveBeenCalled();
		field("Ente Password", "");
		await click("Sign In");
		expect(finishSignIn).toHaveBeenCalledTimes(1);
		field("Ente Password", "corrected password");
		await click("Sign In");
		expect(finishSignIn).toHaveBeenLastCalledWith(
			CONTEXT,
			{ id: 123 },
			"corrected password",
			expect.any(AbortSignal),
			undefined
		);
		expect(signInWithPassword).toHaveBeenCalledTimes(1);
		expect(verifyEmail).toHaveBeenCalledTimes(1);
		expect(launchCommand).toHaveBeenCalledTimes(1);
	});

	it("explains the passkey-only limit and only offers another account", async () => {
		const key = passwordKey();
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({
			id: "attempt",
			authorization: { id: 123, passkeySessionID: "passkey" },
			passwordKey: key,
		});
		await openForm();
		await click("Sign In");
		expect(screen.getByText(/Passkey sign-in is not supported here/)).not.toBeNull();
		expect(screen.getByText(/Enable account TOTP in Ente, then start sign-in again/)).not.toBeNull();
		expect(screen.getByText(/You can keep passkeys enabled when you use TOTP/)).not.toBeNull();
		expect(
			screen.getByText(/remove all passkeys in Ente, sign in here, then add a passkey again/)
		).not.toBeNull();
		expect(screen.queryByText(/return address/)).toBeNull();
		expect(screen.queryByRole("button", { name: "Sign In" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Start Again" })).toBeNull();
		expect(screen.getAllByRole("button")).toHaveLength(1);
		expect(screen.getByRole("button", { name: "Use Another Account" })).not.toBeNull();
		expect(screen.queryByLabelText("Ente Email")).toBeNull();
		expect(screen.queryByLabelText("Ente Password")).toBeNull();
		expect(key.key.every((byte) => byte === 0)).toBe(true);
		expect(finishSignIn).not.toHaveBeenCalled();
		expect(launchCommand).not.toHaveBeenCalled();
		await click("Use Another Account");
		expect((screen.getByLabelText("Ente Email") as HTMLInputElement).value).toBe("");
		expect((screen.getByLabelText("Ente Password") as HTMLInputElement).value).toBe("");
		field("Ente Email", "another@example.com");
		field("Ente Password", "another password");
		await click("Sign In");
		expect(signInWithPassword).toHaveBeenLastCalledWith(
			"another@example.com",
			"another password",
			CONTEXT.apiOrigin,
			expect.any(AbortSignal)
		);
		expect(finishSignIn).toHaveBeenCalledTimes(1);
	});
});

describe("progress and retries", () => {
	it("blocks repeat submissions until sign-in, unlock, and list launch finish", async () => {
		const signIn = deferred<unknown>();
		const finish = deferred<void>();
		const launch = deferred<void>();
		(signInWithPassword as jest.Mock).mockReturnValueOnce(signIn.promise);
		(finishSignIn as jest.Mock).mockReturnValueOnce(finish.promise);
		(launchCommand as jest.Mock).mockReturnValueOnce(launch.promise);
		await openForm();
		await click("Sign In");
		expect(screen.getByRole("region", { name: "Sign In to Ente" }).getAttribute("aria-busy")).toBe("true");
		await click("Signing In…");
		expect(signInWithPassword).toHaveBeenCalledTimes(1);
		await act(async () => signIn.resolve({ id: "attempt", authorization: { id: 123 } }));
		expect(finishSignIn).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button", { name: "Signing In…" })).not.toBeNull();
		await act(async () => finish.resolve());
		expect(screen.getByRole("button", { name: "Opening Get TOTP…" })).not.toBeNull();
		await act(async () => launch.reject(new Error("command unavailable")));
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Signed in, but Get TOTP could not open" })
		);
		await click("Open Get TOTP");
		expect(launchCommand).toHaveBeenCalledTimes(2);
		expect(signInWithPassword).toHaveBeenCalledTimes(1);
		expect(finishSignIn).toHaveBeenCalledTimes(1);
	});

	it("blocks a stale submit callback while the hook already has work in progress", async () => {
		const pending = deferred<unknown>();
		(signInWithPassword as jest.Mock).mockReturnValueOnce(pending.promise);
		const { result } = renderHook(() => useSignIn());
		await waitFor(() => expect(result.current.step).toBe("email"));
		act(() => {
			result.current.setEmail("test@example.com");
			result.current.setPassword(PASSWORD);
		});
		const submit = result.current.submit;
		await act(async () => {
			void submit();
			await submit();
		});
		expect(signInWithPassword).toHaveBeenCalledTimes(1);
		await act(async () => pending.resolve({ id: "attempt", authorization: { id: 123 } }));
		expect(launchCommand).toHaveBeenCalledTimes(1);
	});

	it("restores the form after a failed request without showing private error details", async () => {
		(signInWithPassword as jest.Mock).mockRejectedValueOnce(new Error("private server error"));
		await openForm();
		await click("Sign In");
		expect(showToast).toHaveBeenCalledWith({
			style: Toast.Style.Failure,
			title: "Sign-in failed",
			message: "The operation failed. Try again.",
		});
		await click("Sign In");
		expect(signInWithPassword).toHaveBeenCalledTimes(2);
	});

	it("blocks restart during verification and restores it after a failed code", async () => {
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({ id: "attempt" });
		const pending = deferred<unknown>();
		(verifyEmail as jest.Mock).mockReturnValueOnce(pending.promise);
		await openForm();
		await click("Sign In");
		field("Email Code", "123456");
		await click("Verify Code");
		expect(screen.queryByRole("button", { name: "Start Again" })).toBeNull();
		await click("Verifying Code…");
		expect(verifyEmail).toHaveBeenCalledTimes(1);
		await act(async () => pending.reject(new Error("incorrect code")));
		expect(screen.getByRole("button", { name: "Start Again" })).not.toBeNull();
		expect(screen.getByRole("button", { name: "Verify Code" })).not.toBeNull();
	});
});

describe("key lifetime and unmount", () => {
	it.each(["restart", "close"])("clears the pending key on %s", async (action) => {
		const key = passwordKey();
		(signInWithPassword as jest.Mock).mockResolvedValueOnce({
			id: "attempt",
			authorization: { id: 123, twoFactorSessionID: "totp" },
			passwordKey: key,
		});
		const view = await openForm();
		await click("Sign In");
		if (action === "close") view.unmount();
		else await click("Start Again");
		expect(key.key.every((byte) => byte === 0)).toBe(true);
		expect(finishSignIn).not.toHaveBeenCalled();
	});

	it("clears a key returned after unmount and does not finish sign-in", async () => {
		const key = passwordKey();
		const pending = deferred<unknown>();
		(signInWithPassword as jest.Mock).mockReturnValueOnce(pending.promise);
		const view = await openForm();
		await click("Sign In");
		view.unmount();
		expect((signInWithPassword as jest.Mock).mock.calls[0][3].aborted).toBe(true);
		await act(async () => pending.resolve({ id: "attempt", authorization: { id: 123 }, passwordKey: key }));
		expect(key.key.every((byte) => byte === 0)).toBe(true);
		expect(finishSignIn).not.toHaveBeenCalled();
		expect(launchCommand).not.toHaveBeenCalled();
	});

	it("does not open codes after unmount during unlock", async () => {
		const pending = deferred<void>();
		(finishSignIn as jest.Mock).mockReturnValueOnce(pending.promise);
		const view = await openForm();
		await click("Sign In");
		view.unmount();
		await act(async () => pending.resolve());
		expect(launchCommand).not.toHaveBeenCalled();
		expect(showToast).not.toHaveBeenCalled();
	});
});

describe("saved sessions", () => {
	it("hides credentials while the initial session check is pending and ignores a late result", async () => {
		const pending = deferred<unknown>();
		(getSession as jest.Mock).mockReturnValueOnce(pending.promise);
		const view = render(<SignIn />);
		expect(screen.queryByLabelText("Ente Email")).toBeNull();
		expect(screen.getByRole("region", { name: "Sign In to Ente" }).getAttribute("aria-busy")).toBe("true");
		view.unmount();
		await act(async () => pending.resolve({ id: "saved-session" }));
		expect(launchCommand).not.toHaveBeenCalled();
		expect(signOut).not.toHaveBeenCalled();
	});

	async function savedAccount() {
		(getSession as jest.Mock).mockResolvedValueOnce({ id: "saved-session" });
		const view = render(<SignIn />);
		await screen.findByText(/Already signed in/);
		return view;
	}

	it("opens saved codes only on request, without a new sign-in notice", async () => {
		await savedAccount();
		expect(screen.queryByLabelText("Ente Password")).toBeNull();
		expect(launchCommand).not.toHaveBeenCalled();
		await click("Open Get TOTP");
		expect(launchCommand).toHaveBeenCalledWith({ name: "index", type: LaunchType.UserInitiated });
		expect(signOut).not.toHaveBeenCalled();
	});

	it("keeps the saved account page after a failed list launch", async () => {
		(launchCommand as jest.Mock).mockRejectedValueOnce(new Error("command unavailable"));
		await savedAccount();
		await click("Open Get TOTP");
		expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Get TOTP could not open" }));
		expect(screen.getByText(/Already signed in/)).not.toBeNull();
	});

	it("returns to Raycast without changing the session", async () => {
		await savedAccount();
		await click("Back to Raycast");
		expect(popToRoot).toHaveBeenCalledTimes(1);
		expect(signOut).not.toHaveBeenCalled();
	});

	it("signs out on request and resets both credential fields", async () => {
		await savedAccount();
		await click("Sign Out");
		for (const title of ["Ente Email", "Ente Password"]) {
			expect((screen.getByLabelText(title) as HTMLInputElement).value).toBe("");
		}
		expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Signed out" });
	});

	it("keeps the account page after a failed sign-out", async () => {
		(signOut as jest.Mock).mockRejectedValueOnce(new Error("private storage error"));
		await savedAccount();
		await click("Sign Out");
		expect(screen.getByText(/Already signed in/)).not.toBeNull();
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Sign-out failed", message: "The operation failed. Try again." })
		);
	});

	it.each(["Retry", "Sign Out"])("permits %s after an unreadable session", async (action) => {
		(getSession as jest.Mock).mockRejectedValueOnce(new Error("private storage error"));
		render(<SignIn />);
		await screen.findByText(/Session could not be read/);
		expect(screen.queryByText(/private storage error/)).toBeNull();
		await click(action);
		expect(screen.getByLabelText("Ente Password")).not.toBeNull();
	});

	it("does not show a toast if sign-out finishes after unmount", async () => {
		const pending = deferred<void>();
		(signOut as jest.Mock).mockReturnValueOnce(pending.promise);
		const view = await savedAccount();
		await click("Sign Out");
		view.unmount();
		await act(async () => pending.resolve());
		expect(showToast).not.toHaveBeenCalled();
	});
});
