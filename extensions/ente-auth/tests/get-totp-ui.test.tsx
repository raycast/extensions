/** @jest-environment jsdom */
import { confirmAlert, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { initialTOTPState, TOTPModel, TOTPState } from "../src/cloud/model";
import GetTOTP from "../src/index";

jest.mock("@raycast/api", () => ({
	...jest.requireActual("@raycast/api"),
	...jest.requireActual("./raycast-ui"),
	launchCommand: jest.fn(),
	LaunchType: { UserInitiated: "userInitiated" },
}));
jest.mock("../src/cloud/model", () => ({
	...jest.requireActual("../src/cloud/model"),
	TOTPModel: jest.fn(),
}));
jest.mock("../src/components/CodeList", () => ({
	CodeList: ({ managementActions }: { managementActions: import("react").ReactNode }) => managementActions,
}));

let state: TOTPState;
let model: {
	start: jest.Mock;
	refresh: jest.Mock;
	signOut: jest.Mock;
	removeImportedEntries: jest.Mock;
	dispose: jest.Mock;
};

beforeEach(() => {
	jest.resetAllMocks();
	state = {
		...initialTOTPState,
		loading: false,
		hasSession: true,
		status: "Offline",
		hasImportedEntries: false,
	};
	model = {
		start: jest.fn(),
		refresh: jest.fn().mockResolvedValue(undefined),
		signOut: jest.fn().mockResolvedValue(undefined),
		removeImportedEntries: jest.fn(),
		dispose: jest.fn(),
	};
	(TOTPModel as jest.Mock).mockImplementation((notify) => {
		model.start.mockImplementation(async () => notify(state));
		model.removeImportedEntries.mockImplementation(async () => {
			state = { ...state, hasImportedEntries: false };
			notify(state);
		});
		return model;
	});
	(launchCommand as jest.Mock).mockResolvedValue(undefined);
	(showToast as jest.Mock).mockResolvedValue({});
});

function openList(signedIn = false, strict = false) {
	const command = (
		<GetTOTP arguments={{}} launchType={LaunchType.UserInitiated} launchContext={{ signedIn }} />
	);
	return render(strict ? <StrictMode>{command}</StrictMode> : command);
}

async function click(title: string) {
	await act(async () => fireEvent.click(screen.getByRole("button", { name: title })));
}

it.each([false, true])(
	"shows one success notice only after sign-in, including Strict Mode: %s",
	(signedIn) => {
		openList(signedIn, true);
		expect(showToast).toHaveBeenCalledTimes(signedIn ? 1 : 0);
		if (signedIn) expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Signed in" });
	}
);

it("starts the model on mount and disposes it on unmount", () => {
	const view = openList();
	expect(model.start).toHaveBeenCalledTimes(1);
	view.unmount();
	expect(model.dispose).toHaveBeenCalledTimes(1);
});

it.each([
	{ mode: "cloud", hasSession: false, status: "Sign-in required" },
	{ mode: "cloud", hasSession: false, status: "Sync failed" },
	{ mode: "cloud", hasSession: true, status: "Syncing" },
	{ mode: "cloud", hasSession: true, status: "Up to date" },
	{ mode: "cloud", hasSession: true, status: "Offline" },
	{ mode: "cloud", hasSession: true, status: "Sync failed" },
	{ mode: "import", hasSession: false, status: "Sign-in required" },
] as const)("shows valid account actions for $mode / $status / session=$hasSession", (next) => {
	state = { ...state, ...next };
	openList();
	const canSync = state.mode === "cloud" && state.hasSession;
	expect(Boolean(screen.queryByRole("button", { name: "Sign Out of Ente" }))).toBe(canSync);
	expect(Boolean(screen.queryByRole("button", { name: "Sign In to Ente" }))).toBe(!state.hasSession);
	expect(Boolean(screen.queryByRole("button", { name: /^(Sync Now|Retry)$/ }))).toBe(canSync);
});

it.each([
	["cloud", "Retry"],
	["import", "Reload Imported Entries"],
] as const)("refreshes the model in %s mode", async (mode, action) => {
	state = { ...state, mode, hasSession: mode === "cloud" };
	openList();
	await click(action);
	expect(model.refresh).toHaveBeenCalledTimes(1);
});

it("opens sign-in without first signing out of import mode", async () => {
	state = { ...state, mode: "import", hasSession: false };
	openList();
	await click("Sign In to Ente");
	expect(launchCommand).toHaveBeenCalledWith({ name: "sign-in", type: LaunchType.UserInitiated });
	expect(model.signOut).not.toHaveBeenCalled();
});

it("signs out through the active model", async () => {
	openList();
	await click("Sign Out of Ente");
	expect(model.signOut).toHaveBeenCalledTimes(1);
});

it.each([false, true])("changes to import mode only after confirmation: %s", async (confirmed) => {
	(confirmAlert as jest.Mock).mockResolvedValueOnce(confirmed);
	openList();
	await click("Use Imported Entries");
	if (confirmed) {
		expect(model.signOut).toHaveBeenCalledWith("import");
		expect(launchCommand).toHaveBeenCalledWith({ name: "index", type: LaunchType.UserInitiated });
	} else {
		expect(model.signOut).not.toHaveBeenCalled();
		expect(launchCommand).not.toHaveBeenCalled();
	}
});

it.each([
	["Sign Out of Ente", "Sign-out failed"],
	["Use Imported Entries", "Mode change failed"],
])("reports a failed %s without private error details", async (action, title) => {
	(confirmAlert as jest.Mock).mockResolvedValueOnce(true);
	openList();
	model.signOut.mockRejectedValueOnce(new Error("private storage error"));
	await click(action);
	expect(showToast).toHaveBeenCalledWith({
		style: Toast.Style.Failure,
		title,
		message: "The operation failed. Try again.",
	});
	expect(launchCommand).not.toHaveBeenCalled();
});

describe("import cleanup action", () => {
	it.each([
		["cloud", false, false],
		["cloud", true, true],
		["import", false, false],
		["import", true, false],
	] as const)("is shown in %s mode with saved imports=%s: %s", (mode, hasImportedEntries, visible) => {
		state = { ...state, mode, hasImportedEntries };
		openList();
		expect(Boolean(screen.queryByRole("button", { name: "Remove Imported Entries" }))).toBe(visible);
	});

	it.each([false, true])(
		"removes imports only after confirmation and then hides the action: %s",
		async (confirmed) => {
			state = { ...state, hasImportedEntries: true };
			(confirmAlert as jest.Mock).mockResolvedValueOnce(confirmed);
			openList();
			await click("Remove Imported Entries");
			expect(model.removeImportedEntries).toHaveBeenCalledTimes(confirmed ? 1 : 0);
			expect(Boolean(screen.queryByRole("button", { name: "Remove Imported Entries" }))).toBe(!confirmed);
			expect(model.refresh).not.toHaveBeenCalled();
		}
	);

	it("keeps the action available if removal fails", async () => {
		state = { ...state, hasImportedEntries: true };
		(confirmAlert as jest.Mock).mockResolvedValueOnce(true);
		openList();
		model.removeImportedEntries.mockRejectedValueOnce(new Error("private storage error"));
		await click("Remove Imported Entries");
		expect(screen.getByRole("button", { name: "Remove Imported Entries" })).not.toBeNull();
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Imported entries could not be removed" })
		);
	});
});
