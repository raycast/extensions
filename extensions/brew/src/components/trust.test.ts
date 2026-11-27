import { beforeEach, describe, expect, it, vi } from "vitest";
import { __raycast } from "../utils/__mocks__/raycast-api";
import { ensureTrusted } from "./trust";

const trustState = vi.fn();
const execBrew = vi.fn();

vi.mock("../utils", () => ({
  actionsLogger: { log: () => undefined },
  brewIdentifier: (item: { name: string }) => `kitlangton/tap/${item.name}`,
  brewName: (item: { name: string }) => item.name,
  brewPackageTrust: () => trustState(),
  brewTapCommand: (...args: string[]) => args.join(" "),
  ensureError: (err: unknown) => err,
  execBrew: (...args: unknown[]) => execBrew(...args),
  isCask: () => false,
  showBrewFailureToast: async () => undefined,
  thirdPartyTapOf: () => "kitlangton/tap",
}));

const given = { name: "given" } as never;

// Install puts its progress toast up before this check, and hides it in
// `beforePrompt` so neither an alert nor a failure toast lands on top of it.
describe("ensureTrusted's beforePrompt", () => {
  beforeEach(() => {
    __raycast.reset();
    trustState.mockReset();
    execBrew.mockReset();
  });

  it("is not called when the package is already trusted", async () => {
    trustState.mockResolvedValue("tap");
    const beforePrompt = vi.fn();
    expect(await ensureTrusted(given, { beforePrompt })).toBe(true);
    expect(beforePrompt).not.toHaveBeenCalled();
  });

  it("is called once, before the alert, when trust has to be asked for", async () => {
    trustState.mockResolvedValue("untrusted");
    const beforePrompt = vi.fn(() => expect(__raycast.alerts).toHaveLength(0));
    expect(await ensureTrusted(given, { beforePrompt })).toBe(true);
    expect(beforePrompt).toHaveBeenCalledTimes(1);
    expect(__raycast.alerts).toHaveLength(1);
  });

  it("is called once when the trust check itself fails", async () => {
    trustState.mockRejectedValue(new Error("tap-info failed"));
    const beforePrompt = vi.fn();
    expect(await ensureTrusted(given, { beforePrompt })).toBe(false);
    expect(beforePrompt).toHaveBeenCalledTimes(1);
  });
});
