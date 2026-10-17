import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDeviceSnapshot } from "../src/devices/status";

const mocked = vi.hoisted(() => ({
  getDeviceSnapshot: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock("../src/devices/runtime", () => ({
  createEcoFlowService: () => mocked,
}));

import controlEcoFlowDevice, { confirmation } from "../src/tools/control-ecoflow-device";

describe("confirmed AI device controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes against the serial number resolved during confirmation", async () => {
    const confirmedDevice = buildDeviceSnapshot(
      { sn: "KT21CONFIRMED1234", online: 1, deviceName: "Bedroom WAVE" },
      { "pd.setTemp": 20 },
    );
    mocked.getDeviceSnapshot.mockResolvedValue(confirmedDevice);
    mocked.executeCommand.mockResolvedValue({ device: confirmedDevice, commandTitle: "Set Temperature" });
    const input = { deviceIdentifier: "Bedroom", command: "set_temperature", value: 22 };

    await confirmation(input);
    await controlEcoFlowDevice(input);

    expect(mocked.executeCommand).toHaveBeenCalledWith({
      serialNumber: confirmedDevice.serialNumber,
      commandId: "set_temperature",
      value: 22,
    });

    const replay = await controlEcoFlowDevice(input);
    expect(replay).toMatchObject({ success: false, error: expect.stringMatching(/confirm/i) });
    expect(mocked.executeCommand).toHaveBeenCalledTimes(1);
  });

  it("fails closed when execution has no matching confirmation", async () => {
    const result = await controlEcoFlowDevice({
      deviceIdentifier: "Unconfirmed WAVE",
      command: "set_temperature",
      value: 22,
    });

    expect(result).toMatchObject({ success: false, error: expect.stringMatching(/confirm/i) });
    expect(mocked.executeCommand).not.toHaveBeenCalled();
  });
});
