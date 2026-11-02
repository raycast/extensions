import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  preferences: { userId: "synthetic-private-id", apiEndpoint: "com", menubarMode: "simple", debugMode: false },
  records: new Map<string, string>(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  launchCommand: vi.fn(),
  showToast: vi.fn(),
  environment: { supportPath: "/synthetic/unused", entryPointName: "control-luxafor", launchType: "user" },
}));
vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: mocks.getItem, setItem: mocks.setItem },
  environment: mocks.environment,
  getPreferenceValues: () => mocks.preferences,
  launchCommand: mocks.launchCommand,
  LaunchType: { Background: "background" },
  showToast: mocks.showToast,
  Toast: { Style: { Success: "success", Failure: "failure" } },
  openExtensionPreferences: vi.fn(),
}));
vi.mock("../src/request-guard", () => ({ requestGuard: () => async () => async () => undefined }));
import { createService, refreshMenu, reportResult } from "../src/runtime";
import Busy from "../src/set-busy";
import Available from "../src/set-available";
import Off from "../src/turn-off";

beforeEach(() => {
  mocks.records.clear();
  mocks.preferences.userId = "synthetic-private-id";
  mocks.preferences.apiEndpoint = "com";
  mocks.environment.launchType = "user";
  mocks.environment.entryPointName = "control-luxafor";
  mocks.getItem.mockImplementation(async (key) => mocks.records.get(key));
  mocks.setItem.mockImplementation(async (key, value) => {
    mocks.records.set(key, value);
  });
  mocks.launchCommand.mockResolvedValue(undefined);
  vi.mocked(fetch).mockResolvedValue({ status: 200, json: async () => ({ success: true }) } as Response);
});
describe("entry points and shared storage", () => {
  it.each([
    ["Busy", Busy, { color: "red" }],
    ["Available", Available, { color: "green" }],
    ["Off", Off, { color: "custom", custom_color: "000000" }],
  ] as const)("%s sends exactly its deterministic command", async (_name, command, fields) => {
    await command();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.luxafor.com/webhook/v1/actions/solid_color");
    expect(JSON.parse(init!.body as string).actionFields).toEqual(fields);
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Request Accepted" }));
    expect(JSON.stringify([...mocks.records])).not.toContain(mocks.preferences.userId);
    expect(JSON.stringify(mocks.showToast.mock.calls)).not.toContain(mocks.preferences.userId);
  });
  it("direct commands never send on background launch", async () => {
    mocks.environment.launchType = "background";
    await Busy();
    await Available();
    await Off();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setItem).not.toHaveBeenCalled();
  });
  it("new service instances reload accepted history without requests or writes", async () => {
    await Busy();
    vi.mocked(fetch).mockClear();
    mocks.setItem.mockClear();
    const state = await createService().read();
    expect(state.accepted?.command).toEqual({ kind: "solid", colour: "red" });
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setItem).not.toHaveBeenCalled();
  });
  it("target changes do not inherit another target's accepted state", async () => {
    await Busy();
    mocks.preferences.userId = "another-synthetic-id";
    expect((await createService().read()).accepted).toBeUndefined();
    mocks.preferences.userId = "synthetic-private-id";
    mocks.preferences.apiEndpoint = "co.uk";
    expect((await createService().read()).accepted).toBeUndefined();
    mocks.preferences.apiEndpoint = "com";
    expect((await createService().read()).accepted?.command.colour).toBe("red");
  });
  it("migration is read-only, preserves the old record, and does not claim legacy acceptance", async () => {
    mocks.records.set("luxafor-global-status", '{"isOnline":true,"currentColor":"green"}');
    expect(await createService().read()).toEqual({ version: 2, recent: [], legacyColour: "00ff00" });
    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    await Busy();
    expect(mocks.records.get("luxafor-global-status")).toBe('{"isOnline":true,"currentColor":"green"}');
  });
  it("refreshing the menu never recursively relaunches itself", async () => {
    mocks.environment.entryPointName = "luxafor-status";
    expect(await refreshMenu()).toBe(true);
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("disabled menu cannot turn a successful command into a failed device request", async () => {
    mocks.launchCommand.mockRejectedValue(new Error("disabled"));
    await Busy();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Request Accepted" }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
it("portable commands skip the macOS-only menu on Windows", async () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
  try {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(await refreshMenu()).toBe(true);
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    await Available();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.launchCommand).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
});

it("an existing service keeps its target and history scope when preferences change", async () => {
  const service = createService();
  mocks.preferences.userId = "changed-synthetic-id";
  mocks.preferences.apiEndpoint = "co.uk";
  await service.send({ kind: "solid", colour: "red" });
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toContain("api.luxafor.com/");
  expect(JSON.parse(init!.body as string).userId).toBe("synthetic-private-id");
  expect((await createService().read()).accepted).toBeUndefined();
});
it.each(["timeout", "cancelled", "network", "http", "response"] as const)(
  "%s feedback does not claim rejection when delivery is unknown",
  async (reason) => {
    await reportResult({ ok: false, reason, uncertain: true });
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Delivery Uncertain" }));
  },
);
