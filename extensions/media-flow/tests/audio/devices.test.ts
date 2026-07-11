import { beforeEach, describe, expect, it, vi } from "vitest";

const execSafe = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/exec", () => ({ execSafe }));
import { getDevices, setDefaultOutput } from "../../src/audio/devices";

beforeEach(() => execSafe.mockReset());

/** Maps `args.join(" ")` -> canned stdout, mirroring how execSafe(bin, args) is called.
 * Tolerates being invoked without args (vitest's mock internals can probe a freshly
 * assigned implementation with no arguments) by treating that as a non-matching call. */
function mockCli(responses: Record<string, string | null>) {
  execSafe.mockImplementation(async (_bin?: string, args?: string[]) => {
    const key = (args ?? []).join(" ");
    return key in responses ? responses[key] : null;
  });
}

describe("getDevices", () => {
  it("maps devices with wireless + default flags; duplex device gets two entries", async () => {
    mockCli({
      "list --json": JSON.stringify([
        {
          transportType: "builtin",
          isOutput: true,
          id: 1,
          name: "MacBook Speakers",
          uid: "BuiltInSpeakerDevice",
          isInput: false,
          volume: 0.5,
        },
        {
          transportType: "bluetooth",
          isOutput: true,
          id: 2,
          name: "AirPods Pro",
          uid: "AirPodsProUID",
          isInput: true,
        },
      ]),
      "output get --json": JSON.stringify({
        transportType: "bluetooth",
        id: 2,
        isOutput: true,
        uid: "AirPodsProUID",
        name: "AirPods Pro",
        isInput: true,
      }),
      "input get --json": JSON.stringify({
        transportType: "bluetooth",
        id: 2,
        isOutput: true,
        uid: "AirPodsProUID",
        name: "AirPods Pro",
        isInput: true,
      }),
    });

    const devices = await getDevices();
    const airpodsOut = devices.find((d) => d.id === "2" && d.kind === "output")!;
    expect(airpodsOut).toMatchObject({ name: "AirPods Pro", isWireless: true, isDefault: true });
    expect(devices.find((d) => d.id === "1")).toMatchObject({ isWireless: false, isDefault: false, volume: 0.5 });
    // device 2 is both input and output → two entries
    expect(devices.filter((d) => d.id === "2")).toHaveLength(2);
  });

  it("recognizes bluetoothle transport as wireless", async () => {
    mockCli({
      "list --json": JSON.stringify([
        {
          transportType: "bluetoothle",
          isOutput: true,
          id: 3,
          name: "AirPods Max",
          uid: "AirPodsMaxUID",
          isInput: false,
        },
      ]),
      "output get --json": JSON.stringify({
        transportType: "bluetoothle",
        id: 3,
        isOutput: true,
        uid: "AirPodsMaxUID",
        name: "AirPods Max",
        isInput: false,
      }),
      "input get --json": JSON.stringify({
        transportType: "builtin",
        id: 80,
        isOutput: false,
        uid: "BuiltInMicrophoneDevice",
        name: "MacBook Pro Microphone",
        isInput: true,
      }),
    });

    const devices = await getDevices();
    expect(devices.find((d) => d.id === "3")).toMatchObject({ isWireless: true });
  });

  it("empty array when the CLI fails", async () => {
    execSafe.mockResolvedValue(null);
    expect(await getDevices()).toEqual([]);
  });
});

describe("setDefaultOutput", () => {
  it("true on success", async () => {
    execSafe.mockResolvedValue("Default output device was set to MacBook Pro Speakers");
    expect(await setDefaultOutput("2")).toBe(true);
    expect(execSafe).toHaveBeenCalledWith(expect.any(String), ["output", "set", "2"]);
  });

  it("false on error", async () => {
    execSafe.mockResolvedValue(null);
    expect(await setDefaultOutput("2")).toBe(false);
  });
});
