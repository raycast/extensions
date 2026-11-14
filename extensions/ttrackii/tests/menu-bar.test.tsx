import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MenuBar from "../src/menu-bar";
import { saveSnapshot, tokenStore } from "../src/lib/store";
import {
  cacheValues,
  credentials,
  environment,
  open,
  preferences,
  values,
} from "./raycast-mock";
const fetcher = vi.fn();
let renderer: ReactTestRenderer | undefined;
const current = {
  running: true,
  entry: {
    id: "entry",
    taskName: "Design",
    projectName: "Website",
    workspaceId: "team",
    workspaceName: "Studio",
  },
  elapsedMs: 60000,
  asOf: new Date().toISOString(),
};
async function mount() {
  await act(async () => {
    renderer = create(<MenuBar />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}
function nodes(name: string) {
  return renderer!.root.findAll((node) => node.type === name);
}
beforeEach(async () => {
  vi.clearAllMocks();
  credentials.clear();
  cacheValues.clear();
  for (const key in values) delete values[key];
  preferences.serverUrl = "https://app.ttrackii.com";
  environment.launchType = "background";
  vi.stubGlobal("fetch", fetcher);
  await tokenStore().setTokens({ accessToken: "synthetic-session" });
  fetcher.mockImplementation(async () =>
    Response.json({ ...current, asOf: new Date().toISOString() }),
  );
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});
describe("menu-bar timer", () => {
  it("renders the signed-in menu and cached timer on the very first render", async () => {
    // Any command that confirms the session (or saves a timer) primes the cache.
    await saveSnapshot("timer", current);
    const { isSignedIn } = await import("../src/lib/store");
    await isSignedIn();
    fetcher.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      renderer = create(<MenuBar />);
    });
    expect(
      nodes("menu-item").some((n) => n.props.title === "Connect ttrackii…"),
    ).toBe(false);
    expect(nodes("menu-item")[0].props.title).toBe("Design");
    expect(nodes("menu")[0].props.icon.source).toBe("menu-bar.svg");
  });
  it("forgets the cached session when signing out", async () => {
    const { isSignedIn, forgetSession, menuState } =
      await import("../src/lib/store");
    await isSignedIn();
    expect(menuState().signedIn).toBe(true);
    await forgetSession();
    expect(menuState()).toEqual({ signedIn: false, timer: undefined });
  });
  it("never launches browser sign-in during background refresh", async () => {
    credentials.clear();
    await mount();
    expect(open).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(nodes("menu")[0].props.title).toBeUndefined();
    expect(
      nodes("menu-item").some((n) => n.props.title === "Connect ttrackii…"),
    ).toBe(true);
  });
  it("shows elapsed time as the title and the task in the menu", async () => {
    await mount();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(nodes("menu")[0].props.title).toBe("1m");
    expect(nodes("menu-item")[0].props.title).toBe("Design");
    expect(
      nodes("menu-item").some((n) => n.props.title === "Website · Studio"),
    ).toBe(true);
  });
  it("advances a recent snapshot locally without another request", async () => {
    await saveSnapshot("timer", {
      ...current,
      asOf: new Date(Date.now() - 120000).toISOString(),
    });
    await mount();
    expect(fetcher).not.toHaveBeenCalled();
    expect(nodes("menu")[0].props.title).toBe("3m");
  });
  it("polls in the background only while a timer runs", async () => {
    const idle = { running: false, entry: null, elapsedMs: 0 };
    const age = (data: unknown) => {
      for (const key in values)
        if (key.endsWith(":timer"))
          values[key] = JSON.stringify({ data, savedAt: Date.now() - 600000 });
    };
    // Idle and stale: background runs make no request.
    await saveSnapshot("timer", idle);
    age(idle);
    await mount();
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => renderer!.unmount());
    // Opening the menu refreshes, so timers started elsewhere show up.
    environment.launchType = "user";
    renderer = undefined;
    await mount();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => renderer!.unmount());
    // Running and stale: background runs refresh so a remote stop is noticed.
    environment.launchType = "background";
    renderer = undefined;
    fetcher.mockClear();
    age(current);
    await mount();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps the cached timer and reports a failed refresh", async () => {
    await saveSnapshot("timer", current);
    // Age the snapshot past the background refresh threshold.
    for (const key in values)
      if (key.endsWith(":timer"))
        values[key] = JSON.stringify({
          data: current,
          savedAt: Date.now() - 600000,
        });
    fetcher.mockRejectedValue(new Error("Offline"));
    await mount();
    expect(nodes("menu")[0].props.title).toBeDefined();
    expect(
      nodes("menu-item").find((n) => n.props.title === "Couldn't refresh")!
        .props.subtitle,
    ).toContain("connection");
  });
  it("clears the old account's timer when the session expires during stop", async () => {
    await mount();
    fetcher.mockResolvedValue(Response.json({}, { status: 401 }));
    await act(async () =>
      nodes("menu-item")
        .find((n) => n.props.title === "Stop Timer")!
        .props.onAction(),
    );
    expect(nodes("menu")[0].props.title).toBeUndefined();
    expect(
      nodes("menu-item").some((n) => n.props.title === "Connect ttrackii…"),
    ).toBe(true);
  });
});
