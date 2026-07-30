import { describe, expect, it, vi } from "vitest";

import { getHardwareInfo } from "../lib/hardware-info";
import { execf } from "../lib/exec";

vi.mock("../lib/exec", () => ({
  execf: vi.fn(),
}));

const HARDWARE_OUTPUT = `Hardware:

    Hardware Overview:

      Model Name: MacBook Pro
      Model Identifier: Mac14,7
      Model Number: Z16R000UMKS/A
      Chip: Apple M2
      Total Number of Cores: 8 (4 performance and 4 efficiency)
      Memory: 16 GB
      System Firmware Version: 8422.141.2
      Serial Number (system): ABC123XYZ
`;

const DISPLAY_OUTPUT = `Graphics/Displays:

    Apple M2:

      Chipset Model: Apple M2
      Type: GPU
      Bus: Built-In
      Total Number of Cores: 10
`;

const IOREG_PRODUCT_NAME_OUTPUT = `<plist version="1.0"><array><dict>
<key>AAPL,phandle</key>
<data>TQEAAA==</data>
<key>product-name</key>
<data>TWFjQm9vayBQcm8gKDE2LWluY2gsIDIwMjEpAA==</data>
</dict></array></plist>`;

const DISPLAY_OUTPUT_DISCRETE = `Graphics/Displays:

    AMD Radeon Pro 5500M:

      Chipset Model: AMD Radeon Pro 5500M
      Type: GPU
      VRAM (Total): 8 GB
`;

describe("getHardwareInfo", () => {
  it("parses system_profiler output into hardware info", async () => {
    vi.mocked(execf).mockImplementation(async (cmd, args) => {
      if (cmd.includes("ioreg")) {
        return IOREG_PRODUCT_NAME_OUTPUT;
      }
      return args?.includes("SPHardwareDataType") ? HARDWARE_OUTPUT : DISPLAY_OUTPUT;
    });

    const info = await getHardwareInfo();

    expect(info.modelName).toBe("MacBook Pro");
    expect(info.modelIdentifier).toBe("Mac14,7");
    expect(info.chip).toBe("Apple M2");
    expect(info.totalCores).toBe("8 (4 performance and 4 efficiency)");
    expect(info.memory).toBe("16 GB");
    expect(info.serialNumber).toBe("ABC123XYZ");
    expect(info.gpuChipset).toBe("Apple M2");
    expect(info.gpuCores).toBe("10");
    expect(info.isUnifiedMemory).toBe(true);
    expect(info.gpuMemory).toBe("Shared (16 GB system memory)");
  });

  it("caches the result and skips re-running system_profiler", async () => {
    vi.resetModules();
    vi.mocked(execf).mockImplementation(async (cmd, args) => {
      if (cmd.includes("ioreg")) {
        return IOREG_PRODUCT_NAME_OUTPUT;
      }
      return args?.includes("SPHardwareDataType") ? HARDWARE_OUTPUT : DISPLAY_OUTPUT;
    });
    const { getHardwareInfo: freshGetHardwareInfo } = await import("../lib/hardware-info");

    await freshGetHardwareInfo();
    vi.mocked(execf).mockClear();

    const info = await freshGetHardwareInfo();

    expect(info.modelName).toBe("MacBook Pro");
    expect(vi.mocked(execf)).not.toHaveBeenCalled();
  });

  it("reports discrete VRAM without the unified-memory label", async () => {
    vi.resetModules();
    vi.mocked(execf).mockImplementation(async (_cmd, args) =>
      args?.includes("SPHardwareDataType") ? HARDWARE_OUTPUT : DISPLAY_OUTPUT_DISCRETE,
    );

    const { getHardwareInfo: freshGetHardwareInfo } = await import("../lib/hardware-info");
    const info = await freshGetHardwareInfo();

    expect(info.isUnifiedMemory).toBe(false);
    expect(info.gpuMemory).toBe("8 GB");
  });
});
