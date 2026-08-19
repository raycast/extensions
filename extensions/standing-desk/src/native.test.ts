import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawn = vi.hoisted(() => vi.fn());
const beginMovementRequest = vi.hoisted(() =>
  vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
);
const getDeskSelection = vi.hoisted(() => vi.fn());
const getConfiguration = vi.hoisted(() => vi.fn());
const requireDeskSelection = vi.hoisted(() => vi.fn());
const saveCachedDeskStatus = vi.hoisted(() => vi.fn());

vi.mock("@raycast/api", () => ({
  environment: {
    assetsPath: "/extension/assets",
    supportPath: "/extension/support",
  },
}));
vi.mock("node:child_process", () => ({ spawn }));
vi.mock("node:fs/promises", () => ({
  access: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
}));
vi.mock("./diagnostics", () => ({ logDiagnostic: vi.fn() }));
vi.mock("./movement-request", () => ({ beginMovementRequest }));
vi.mock("./storage", () => ({
  getConfiguration,
  getDeskSelection,
  hasAcknowledgedSafety: vi.fn(async () => true),
  requireDeskSelection,
  saveCachedDeskStatus,
}));

import { discoverDesks, moveDesk, readDesk, stopDesk } from "./native";

type FakeChild = EventEmitter & {
  stdout: EventEmitter & { setEncoding: (encoding: string) => void };
  stderr: EventEmitter & { setEncoding: (encoding: string) => void };
  kill: ReturnType<typeof vi.fn>;
};

function fakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.kill = vi.fn();
  return child;
}

const deskA = {
  identifier: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  token: "selection-a",
};
const configuration = {
  deskName: "Desk",
  baseHeight: 62,
  minimumHeight: 62,
  maximumHeight: 127,
  stepHeight: 1,
};

describe("native desk command targeting", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    getDeskSelection.mockResolvedValue(deskA);
    getConfiguration.mockResolvedValue(configuration);
    requireDeskSelection.mockResolvedValue(deskA);
    saveCachedDeskStatus.mockResolvedValue(undefined);
  });

  it("does not start status or movement without a selected desk", async () => {
    requireDeskSelection.mockRejectedValue(
      new Error("Select a desk before using this command."),
    );

    await expect(readDesk()).rejects.toThrow("Select a desk");
    await expect(moveDesk(70)).rejects.toThrow("Select a desk");
    expect(beginMovementRequest).toHaveBeenCalledOnce();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("publishes cancellation but does not scan by name when Stop has no desk", async () => {
    vi.useFakeTimers();
    getDeskSelection.mockResolvedValue(undefined);

    const stop = stopDesk();
    const rejection = expect(stop).rejects.toThrow("No desk is selected");
    await vi.advanceTimersByTimeAsync(700);

    await rejection;
    expect(beginMovementRequest).toHaveBeenCalledOnce();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("keeps Stop bound to the desk captured before handoff", async () => {
    vi.useFakeTimers();
    const child = fakeChild();
    spawn.mockReturnValue(child);

    const stop = stopDesk();
    await vi.advanceTimersByTimeAsync(0);
    expect(beginMovementRequest).toHaveBeenCalledOnce();
    getDeskSelection.mockResolvedValue({
      identifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      token: "selection-b",
    });
    await vi.advanceTimersByTimeAsync(700);

    expect(spawn).toHaveBeenCalledOnce();
    const args = spawn.mock.calls[0][1] as string[];
    expect(args).toContain("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(args).not.toContain("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    child.stdout.emit(
      "data",
      `${JSON.stringify({
        event: "complete",
        outcome: "stopped",
        identifier: deskA.identifier,
      })}\n`,
    );
    child.emit("close", 0);
    await expect(stop).rejects.toThrow("selected desk changed");
  });

  it("rejects a helper event from a different desk", async () => {
    const child = fakeChild();
    spawn.mockReturnValue(child);

    const status = readDesk();
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.stdout.emit(
      "data",
      `${JSON.stringify({
        event: "complete",
        identifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      })}\n`,
    );
    child.emit("close", null);

    await expect(status).rejects.toThrow("different desk");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("suppresses callbacks after the selected desk changes", async () => {
    const child = fakeChild();
    const onEvent = vi.fn();
    spawn.mockReturnValue(child);

    const status = readDesk(onEvent);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    getDeskSelection.mockResolvedValue({
      identifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      token: "selection-b",
    });
    child.stdout.emit(
      "data",
      `${JSON.stringify({
        event: "complete",
        identifier: deskA.identifier,
        heightCm: 80,
      })}\n`,
    );
    child.emit("close", 0);

    await expect(status).rejects.toThrow("selected desk changed");
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("allows discovery to report desks other than the remembered desk", async () => {
    const child = fakeChild();
    spawn.mockReturnValue(child);
    const deskB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const discovery = discoverDesks("Desk");
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.stdout.emit(
      "data",
      [
        JSON.stringify({
          event: "device",
          identifier: deskB,
          deskName: "Desk B",
        }),
        JSON.stringify({ event: "complete" }),
        "",
      ].join("\n"),
    );
    child.emit("close", 0);

    await expect(discovery).resolves.toContainEqual(
      expect.objectContaining({ identifier: deskB }),
    );
    expect(child.kill).not.toHaveBeenCalled();
  });

  it("publishes movement before awaiting its desk context", async () => {
    const child = fakeChild();
    spawn.mockReturnValue(child);
    let releaseConfiguration:
      ((value: typeof configuration) => void) | undefined;
    getConfiguration.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseConfiguration = resolve;
        }),
    );

    const move = moveDesk(70);
    await vi.waitFor(() => expect(beginMovementRequest).toHaveBeenCalledOnce());
    expect(requireDeskSelection).not.toHaveBeenCalled();

    releaseConfiguration?.(configuration);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.stdout.emit(
      "data",
      `${JSON.stringify({
        event: "complete",
        outcome: "reached",
        identifier: deskA.identifier,
      })}\n`,
    );
    child.emit("close", 0);

    await expect(move).resolves.toMatchObject({ outcome: "reached" });
  });

  it("persists native progress in event order before completing", async () => {
    const child = fakeChild();
    spawn.mockReturnValue(child);
    let releaseFirstWrite: (() => void) | undefined;
    saveCachedDeskStatus.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirstWrite = resolve;
        }),
    );

    const status = readDesk();
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.stdout.emit(
      "data",
      [
        JSON.stringify({
          event: "status",
          identifier: deskA.identifier,
          heightCm: 80,
        }),
        JSON.stringify({
          event: "complete",
          identifier: deskA.identifier,
          heightCm: 81,
        }),
        "",
      ].join("\n"),
    );
    child.emit("close", 0);

    await vi.waitFor(() => expect(saveCachedDeskStatus).toHaveBeenCalledOnce());
    releaseFirstWrite?.();
    await expect(status).resolves.toMatchObject({ heightCm: 81 });
    expect(saveCachedDeskStatus).toHaveBeenCalledTimes(2);
    expect(
      saveCachedDeskStatus.mock.calls.map(([value]) => value.heightCm),
    ).toEqual([80, 81]);
  });
});
