import { beforeEach, describe, expect, it, vi } from "vitest";

// The command's own steps, against a stubbed Raycast API and a stubbed Linkonda API. No network, no Raycast app.
const raycast = vi.hoisted(() => ({
  readText: vi.fn<() => Promise<string | undefined>>(),
  copy: vi.fn<(text: string) => Promise<void>>(),
  showToast: vi.fn<(options: unknown) => Promise<unknown>>(),
  apiKey: undefined as string | undefined,
}));

vi.mock("@raycast/api", () => {
  const Stub = () => null;
  return {
    Clipboard: { readText: raycast.readText, copy: raycast.copy },
    getPreferenceValues: () => ({ apiKey: raycast.apiKey }),
    showToast: raycast.showToast,
    Toast: { Style: { Success: "success", Failure: "failure" } },
    openExtensionPreferences: Stub,
    Keyboard: { Shortcut: { Common: { Open: {} } } },
    Action: Object.assign(Stub, { CopyToClipboard: Stub, OpenInBrowser: Stub }),
    ActionPanel: Stub,
    Detail: Object.assign(Stub, { Metadata: Object.assign(Stub, { Link: Stub, Label: Stub }) }),
  };
});

import { run } from "../src/shorten-clipboard-url";

const created = {
  id: "abc",
  slug: "x7Kp2",
  shortUrl: "https://lnko.eu/x7Kp2",
  savedToAccount: false,
  expiresAt: null,
};
const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );

beforeEach(() => {
  vi.unstubAllGlobals();
  raycast.readText.mockReset().mockResolvedValue("https://example.com/a");
  raycast.copy.mockReset().mockResolvedValue(undefined);
  raycast.showToast.mockReset().mockResolvedValue(undefined);
  raycast.apiKey = undefined;
});

describe("the command", () => {
  it("does not copy on a failure", async () => {
    respond(429, { code: "QUOTA_EXCEEDED", error: "x", tier: "anonymous" });
    const state = await run();
    expect(state).toMatchObject({ view: "failed", failure: { kind: "quota" } });
    expect(raycast.copy).not.toHaveBeenCalled();
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Limit reached for links without an account",
    });
  });

  it("sends nothing and copies nothing when the clipboard holds no URL", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    raycast.readText.mockResolvedValue("see https://example.com/a");
    expect(await run()).toEqual({ view: "no-url", reason: "none" });
    raycast.readText.mockRejectedValue(new Error("no access"));
    expect(await run()).toEqual({ view: "no-url", reason: "none" });
    expect(fetchStub).not.toHaveBeenCalled();
    expect(raycast.copy).not.toHaveBeenCalled();
  });

  it("copies only shortUrl after a 201", async () => {
    respond(201, created);
    const state = await run();
    expect(state).toMatchObject({ view: "done", destination: "https://example.com/a", copied: true });
    expect(raycast.copy).toHaveBeenCalledTimes(1);
    expect(raycast.copy).toHaveBeenCalledWith("https://lnko.eu/x7Kp2");
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "success",
      title: "Short link copied",
      message: "https://lnko.eu/x7Kp2",
    });
  });

  it("ends in a view when the toast or the copy rejects", async () => {
    respond(201, created);
    raycast.showToast.mockRejectedValue(new Error("toast"));
    expect(await run()).toMatchObject({ view: "done", copied: true });

    raycast.copy.mockRejectedValue(new Error("copy"));
    const state = await run();
    expect(state).toMatchObject({ view: "done", copied: false });
    expect(raycast.showToast).toHaveBeenCalledTimes(1); // the success toast of the first run only

    respond(500, {});
    expect(await run()).toMatchObject({ view: "failed", failure: { kind: "unavailable" } });
  });
});
