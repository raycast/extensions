import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTION_WAIT_TIMEOUT_MS,
  AgentConnectionError,
  AgentLaunchError,
  AgentTimeoutError,
  AppFreezerCLIMissingError,
  AppFreezerClientDependencies,
  AppFreezerNotInstalledError,
  createAppFreezerClient,
} from "../src/client";
import { ProtocolError } from "../src/protocol";

const appPath = "/Users/test/Applications/App Freezer.app";
const cliPath = `${appPath}/Contents/MacOS/appfreezerctl`;

function snapshot(lastAction?: { requestID: string; status: "succeeded" | "failed"; message?: string }): string {
  return JSON.stringify({
    protocolVersion: 4,
    generatedAt: "2026-08-03T00:00:00Z",
    applications: [
      {
        id: "opaque-id",
        name: "Example",
        bundleIdentifier: "com.example.app",
        bundlePath: "/Applications/Example.app",
        cpuPercent: 1.5,
        memoryPercent: 2.5,
        status: "running",
        canPause: true,
        canQuit: true,
      },
    ],
    lastAction,
  });
}

function dependencies(overrides: Partial<AppFreezerClientDependencies> = {}): AppFreezerClientDependencies {
  return {
    getInstalledApplications: vi.fn().mockResolvedValue([{ bundleId: "com.chxsong.AppFreezer", path: appPath }]),
    accessFile: vi.fn().mockResolvedValue(undefined),
    runCLI: vi.fn().mockResolvedValue({ stdout: snapshot() }),
    openURL: vi.fn().mockResolvedValue(undefined),
    makeRequestID: () => "request-1",
    ...overrides,
  };
}

describe("App Freezer client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("locates the bundled CLI and loads a refreshed snapshot", async () => {
    const deps = dependencies();
    const client = createAppFreezerClient(deps);

    await expect(client.loadSnapshot()).resolves.toMatchObject({ protocolVersion: 4 });
    expect(deps.accessFile).toHaveBeenCalledWith(cliPath);
    expect(deps.runCLI).toHaveBeenCalledWith(cliPath, ["list", "--json"], 5_000);
  });

  it("reports when App Freezer is not installed", async () => {
    const client = createAppFreezerClient(dependencies({ getInstalledApplications: vi.fn().mockResolvedValue([]) }));
    await expect(client.loadSnapshot()).rejects.toBeInstanceOf(AppFreezerNotInstalledError);
  });

  it("reports a missing bundled CLI", async () => {
    const client = createAppFreezerClient(dependencies({ accessFile: vi.fn().mockRejectedValue(new Error("ENOENT")) }));
    await expect(client.loadSnapshot()).rejects.toBeInstanceOf(AppFreezerCLIMissingError);
  });

  it("preserves protocol incompatibility errors", async () => {
    const client = createAppFreezerClient(
      dependencies({
        runCLI: vi.fn().mockResolvedValue({ stdout: snapshot().replace('"protocolVersion":4', '"protocolVersion":1') }),
      }),
    );
    await expect(client.loadSnapshot()).rejects.toBeInstanceOf(ProtocolError);
  });

  it("reports agent startup and connection failures separately", async () => {
    const startupClient = createAppFreezerClient(
      dependencies({ getInstalledApplications: vi.fn().mockRejectedValue(new Error("Launch Services unavailable")) }),
    );
    await expect(startupClient.loadSnapshot()).rejects.toBeInstanceOf(AgentConnectionError);

    const launchClient = createAppFreezerClient(
      dependencies({ openURL: vi.fn().mockRejectedValue(new Error("no handler")) }),
    );
    await expect(launchClient.performAction("pause", "opaque-id")).rejects.toBeInstanceOf(AgentLaunchError);
  });

  it("sends a pause request and accepts only the matching completion", async () => {
    const deps = dependencies({
      runCLI: vi.fn().mockResolvedValue({ stdout: snapshot({ requestID: "request-1", status: "succeeded" }) }),
    });
    const client = createAppFreezerClient(deps);

    await expect(client.performAction("pause", "opaque-id")).resolves.toMatchObject({
      lastAction: { requestID: "request-1", status: "succeeded" },
    });
    expect(deps.openURL).toHaveBeenCalledWith("appfreezer://pause?requestID=request-1&id=opaque-id");
    expect(deps.runCLI).toHaveBeenCalledWith(
      cliPath,
      ["wait", "--request-id", "request-1", "--json"],
      ACTION_WAIT_TIMEOUT_MS,
    );
  });

  it("rejects actions missing an application ID without external side effects", async () => {
    const deps = dependencies();
    const client = createAppFreezerClient(deps);
    await expect(client.performAction("quit")).rejects.toThrow("requires an application ID");
    expect(deps.getInstalledApplications).not.toHaveBeenCalled();
    expect(deps.openURL).not.toHaveBeenCalled();
    expect(deps.runCLI).not.toHaveBeenCalled();
  });

  it("sends normal Quit through the native agent", async () => {
    const deps = dependencies({
      runCLI: vi.fn().mockResolvedValue({ stdout: snapshot({ requestID: "request-1", status: "succeeded" }) }),
    });
    const client = createAppFreezerClient(deps);
    await client.performAction("quit", "opaque-id");
    expect(deps.openURL).toHaveBeenCalledWith("appfreezer://quit?requestID=request-1&id=opaque-id");
  });

  it("sends Force Quit through the protocol v4 native agent", async () => {
    const deps = dependencies({
      runCLI: vi.fn().mockResolvedValue({ stdout: snapshot({ requestID: "request-1", status: "succeeded" }) }),
    });
    const client = createAppFreezerClient(deps);
    await client.performAction("force-quit", "opaque-id");
    expect(deps.openURL).toHaveBeenCalledWith("appfreezer://force-quit?requestID=request-1&id=opaque-id");
  });

  it("opens the native Settings URL exactly", async () => {
    const deps = dependencies();
    const client = createAppFreezerClient(deps);
    await client.openSettings();
    expect(deps.openURL).toHaveBeenCalledWith("appfreezer://settings");
  });

  it("surfaces a native-agent refusal without replacing it with a generic error", async () => {
    const client = createAppFreezerClient(
      dependencies({
        runCLI: vi.fn().mockResolvedValue({
          stdout: snapshot({ requestID: "request-1", status: "failed", message: "Protected app." }),
        }),
      }),
    );
    await expect(client.performAction("pause", "opaque-id")).rejects.toThrow("Protected app.");
  });

  it("uses the native fallback message when a refusal has no message", async () => {
    const client = createAppFreezerClient(
      dependencies({
        runCLI: vi.fn().mockResolvedValue({ stdout: snapshot({ requestID: "request-1", status: "failed" }) }),
      }),
    );
    await expect(client.performAction("pause", "opaque-id")).rejects.toThrow(
      "App Freezer could not complete the action.",
    );
  });

  it("serializes actions so protocol v4 results cannot overwrite each other", async () => {
    let finishFirst: ((value: { stdout: string }) => void) | undefined;
    const runCLI = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ stdout: string }>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ stdout: snapshot({ requestID: "request-2", status: "succeeded" }) });
    let requestNumber = 0;
    const deps = dependencies({ runCLI, makeRequestID: () => `request-${++requestNumber}` });
    const client = createAppFreezerClient(deps);

    const first = client.performAction("pause", "one");
    const second = client.performAction("resume", "two");
    await vi.waitFor(() => expect(runCLI).toHaveBeenCalledTimes(1));
    expect(deps.openURL).toHaveBeenCalledTimes(1);
    finishFirst?.({ stdout: snapshot({ requestID: "request-1", status: "succeeded" }) });
    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
    expect(runCLI).toHaveBeenCalledTimes(2);
  });

  it("serializes Refresh behind an in-flight action", async () => {
    let finishAction: ((value: { stdout: string }) => void) | undefined;
    const runCLI = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ stdout: string }>((resolve) => {
            finishAction = resolve;
          }),
      )
      .mockResolvedValueOnce({ stdout: snapshot() });
    const deps = dependencies({ runCLI });
    const client = createAppFreezerClient(deps);

    const action = client.performAction("pause", "one");
    const refresh = client.loadSnapshot();
    await vi.waitFor(() => expect(runCLI).toHaveBeenCalledTimes(1));
    finishAction?.({ stdout: snapshot({ requestID: "request-1", status: "succeeded" }) });
    await expect(action).resolves.toBeDefined();
    await expect(refresh).resolves.toBeDefined();
    expect(runCLI.mock.calls[1]?.[1]).toEqual(["list", "--json"]);
  });

  it("reports both CLI timeouts and stale action results as action timeouts", async () => {
    const timedOut = Object.assign(new Error("Command failed"), { stderr: "Agent did not respond within 3 seconds." });
    const cliTimeoutClient = createAppFreezerClient(dependencies({ runCLI: vi.fn().mockRejectedValue(timedOut) }));
    await expect(cliTimeoutClient.performAction("resume", "opaque-id")).rejects.toBeInstanceOf(AgentTimeoutError);

    const staleClient = createAppFreezerClient(
      dependencies({
        runCLI: vi.fn().mockResolvedValue({ stdout: snapshot({ requestID: "older", status: "succeeded" }) }),
      }),
    );
    await expect(staleClient.performAction("resume", "opaque-id")).rejects.toBeInstanceOf(AgentTimeoutError);
  });
});
