/** @jest-environment jsdom */
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getFavicon, useFrecencySorting } from "@raycast/utils";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { initialTOTPState, TOTPState } from "../src/cloud/model";
import { CodeList } from "../src/components/CodeList";
import { ensureIcons, getIconPath } from "../src/helpers/icons";
import { JsonFormat } from "../src/helpers/types";
import { deferred } from "./deferred";

jest.mock("@raycast/api", () => ({
	...jest.requireActual("@raycast/api"),
	...jest.requireActual("./raycast-ui"),
	getPreferenceValues: jest.fn(),
}));
jest.mock("@raycast/utils", () => ({
	usePromise: jest.requireActual("@raycast/utils").usePromise,
	getProgressIcon: jest.fn(() => "progress"),
	getFavicon: jest.fn(() => "favicon"),
	useFrecencySorting: jest.fn(),
}));
jest.mock("../src/helpers/icons", () => ({ ensureIcons: jest.fn(), getIconPath: jest.fn() }));

const item: JsonFormat = {
	id: "entry-a",
	service_name: "Synthetic",
	username: "test@example.com",
	current_totp: "12345678",
	next_totp: "87654321",
	current_totp_time_remaining: 42,
	algorithm: "SHA256",
	digits: 8,
	period: "60",
	tags: ["work"],
	notes: "",
};
const visitItem = jest.fn();
const resetRanking = jest.fn();
const baseState: TOTPState = { ...initialTOTPState, hasSession: true, loading: false, status: "Offline" };

beforeEach(() => {
	jest.resetAllMocks();
	(getPreferenceValues as jest.Mock).mockReturnValue({ primaryAction: "paste" });
	(useFrecencySorting as jest.Mock).mockImplementation((items) => ({ data: items, visitItem, resetRanking }));
	(ensureIcons as jest.Mock).mockResolvedValue(undefined);
	(showToast as jest.Mock).mockImplementation(async () => ({}));
});

async function showCodes(items = [item], state = baseState) {
	let view!: ReturnType<typeof render>;
	await act(async () => {
		view = render(<CodeList items={items} state={state} managementActions={null} />);
	});
	return view;
}

async function click(title: string) {
	await act(async () => fireEvent.click(screen.getByRole("button", { name: title })));
}

it.each([
	["cloud", "copy"],
	["cloud", "paste"],
	["import", "copy"],
	["import", "paste"],
] as const)("keeps icons, ranking, and the %s / %s action preference", async (mode, primaryAction) => {
	(getPreferenceValues as jest.Mock).mockReturnValue({ primaryAction });
	(getIconPath as jest.Mock).mockReturnValue("cached-icon.svg");
	const view = await showCodes([item], { ...baseState, mode });
	expect(getIconPath).toHaveBeenCalledWith(item.service_name);
	expect(
		JSON.parse(screen.getByRole("region", { name: item.service_name }).getAttribute("data-icon")!)
	).toEqual({ source: "cached-icon.svg" });
	expect(screen.getAllByRole("button")[0].textContent).toBe(
		primaryAction === "copy" ? "Copy Current" : "Paste Current"
	);
	for (const title of ["Copy Current", "Paste Current", "Copy Next"]) {
		const button = screen.getByRole("button", { name: title });
		expect(button.getAttribute("data-content")).toBe(
			title === "Copy Next" ? item.next_totp : item.current_totp
		);
		expect(button.getAttribute("data-concealed")).toBeNull();
		await click(title);
	}
	expect(visitItem).toHaveBeenCalledTimes(3);
	expect(visitItem).toHaveBeenCalledWith(item);
	expect((useFrecencySorting as jest.Mock).mock.calls[0][1].key(item)).toBe(item.service_name);
	await click("Reset Ranking");
	expect(resetRanking).toHaveBeenCalledWith(item);
	expect(ensureIcons).toHaveBeenCalledTimes(1);
	view.rerender(
		<CodeList
			items={[{ ...item, current_totp: "11111111" }]}
			state={{ ...baseState, mode }}
			managementActions={null}
		/>
	);
	expect(ensureIcons).toHaveBeenCalledTimes(1);
	await click("Refresh Icons");
	expect(ensureIcons).toHaveBeenLastCalledWith([item.service_name], true);
});

it.each([false, true])("loads icons when sync replaces or adds a service: add=%s", async (add) => {
	const view = await showCodes();
	const syncedItem = { ...item, id: "entry-b", service_name: "New service" };
	const items = add ? [item, syncedItem] : [syncedItem];
	let iconReady = false;
	(getIconPath as jest.Mock).mockImplementation((service) =>
		iconReady && service === syncedItem.service_name ? "new-icon.svg" : undefined
	);
	(ensureIcons as jest.Mock).mockImplementationOnce(async () => {
		iconReady = true;
	});

	await act(async () => {
		view.rerender(<CodeList items={items} state={baseState} managementActions={null} />);
	});

	expect(ensureIcons).toHaveBeenCalledTimes(2);
	expect(ensureIcons).toHaveBeenLastCalledWith(items.map((entry) => entry.service_name));
	expect(screen.getByRole("region", { name: syncedItem.service_name }).getAttribute("data-icon")).toBe(
		JSON.stringify({ source: "new-icon.svg" })
	);
});

it("keeps favicon fallback and note links in cloud mode", async () => {
	await showCodes([{ ...item, notes: "https://example.com" }]);
	expect(getFavicon).toHaveBeenCalledWith("https://example.com");
	expect(screen.getByRole("link", { name: /Notes/ }).getAttribute("href")).toBe("https://example.com");
});

it("reports an icon refresh failure without losing codes", async () => {
	await showCodes();
	const toast = { style: Toast.Style.Animated, title: "Refreshing icons" };
	(showToast as jest.Mock).mockResolvedValueOnce(toast);
	(ensureIcons as jest.Mock).mockRejectedValueOnce(new Error("offline"));
	await click("Refresh Icons");
	expect(toast).toEqual({ style: Toast.Style.Failure, title: "Icons could not be refreshed" });
	expect(screen.getByRole("button", { name: "Copy Current" }).getAttribute("data-content")).toBe(
		item.current_totp
	);
});

it("can unmount while icon loading is pending", async () => {
	const pending = deferred<void>();
	(ensureIcons as jest.Mock).mockReturnValueOnce(pending.promise);
	const view = await showCodes();
	view.unmount();
	await act(async () => pending.resolve());
	expect(view.container.childElementCount).toBe(0);
	expect(ensureIcons).toHaveBeenCalledTimes(1);
});

it("shows sync errors beside cached codes", async () => {
	await showCodes([item], { ...baseState, error: "Safe sync error" });
	expect(screen.getByText("Safe sync error")).not.toBeNull();
});

it.each([true, false])("shows the custom server in Get TOTP with entries=%s", async (hasEntries) => {
	const apiOrigin = "https://api.example.com:8443";
	const view = await showCodes(hasEntries ? [item] : [], { ...baseState, apiOrigin });
	expect(screen.getByRole("region", { name: `Get TOTP — ${apiOrigin}` })).not.toBeNull();
	if (hasEntries) {
		expect(screen.getByRole("region", { name: "Server" }).textContent).toContain(apiOrigin);
		expect(screen.queryByRole("link", { name: /Server/ })).toBeNull();
	}
	await act(async () => {
		view.rerender(
			<CodeList items={[]} state={{ ...baseState, hasSession: false }} managementActions={null} />
		);
	});
	expect(screen.queryByRole("region", { name: `Get TOTP — ${apiOrigin}` })).toBeNull();
	await act(async () => {
		view.rerender(
			<CodeList items={[item]} state={{ ...baseState, mode: "import", apiOrigin }} managementActions={null} />
		);
	});
	expect(screen.queryByRole("region", { name: "Server" })).toBeNull();
	expect(screen.getByRole("region", { name: "Get TOTP" })).not.toBeNull();
});

it.each([
	{
		mode: "cloud",
		status: "Sign-in required",
		loading: false,
		title: "Sign in to Ente",
		description: "Sign in to Ente. Or use Import Secrets.",
	},
	{
		mode: "cloud",
		status: "Syncing",
		loading: true,
		title: "Loading entries",
		description: "Last successful sync: Not yet synced",
	},
	{
		mode: "import",
		status: "Sign-in required",
		loading: false,
		title: "No entries found",
		description: 'Run "Import Secrets" to load entries with the Ente CLI. Or sign in to Ente for auto-sync.',
	},
] as const)(
	"shows useful empty-state guidance in $mode / $status",
	async ({ title, description, ...state }) => {
		await showCodes([], { ...baseState, ...state });
		expect(screen.getByRole("heading", { name: title })).not.toBeNull();
		expect(screen.getByText(description)).not.toBeNull();
	}
);
