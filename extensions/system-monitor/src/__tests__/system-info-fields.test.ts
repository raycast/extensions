import { describe, expect, it } from "vitest";

import type { HardwareInfo } from "../lib/hardware-info";
import { systemInfoCopyFields } from "../lib/system-info-fields";

const hardware: HardwareInfo = {
  modelName: "MacBook Pro",
  modelIdentifier: "Mac14,7",
  modelNumber: "Z16R000UMKS/A",
  modelYear: "2023",
  chip: "Apple M2",
  totalCores: "8",
  memory: "16 GB",
  serialNumber: "ABC123XYZ",
  gpuChipset: "Apple M2",
  gpuCores: "10",
  gpuMemory: "Shared (16 GB system memory)",
  isUnifiedMemory: true,
};

const osInfo = { release: "15.5", build: "24F74", display: "macOS 15.5 (24F74)" };

describe("systemInfoCopyFields", () => {
  it("lists each System Info value as its own copyable field", () => {
    expect(systemInfoCopyFields("my-mac", hardware, osInfo)).toEqual([
      { title: "macOS Version", value: "macOS 15.5 (24F74)" },
      { title: "Hostname", value: "my-mac" },
      { title: "Model", value: "MacBook Pro" },
      { title: "Model Year", value: "2023" },
      { title: "Model Identifier", value: "Mac14,7" },
      { title: "Model Number", value: "Z16R000UMKS/A" },
      { title: "Chip", value: "Apple M2" },
      { title: "GPU", value: "Apple M2" },
      { title: "Memory", value: "16 GB" },
      { title: "Serial Number", value: "ABC123XYZ" },
    ]);
  });

  it("offers only the hostname before hardware and OS info load", () => {
    expect(systemInfoCopyFields("my-mac")).toEqual([{ title: "Hostname", value: "my-mac" }]);
  });

  it("skips values the probes reported as Unknown", () => {
    const titles = systemInfoCopyFields("my-mac", { ...hardware, modelYear: "Unknown" }, osInfo).map((f) => f.title);
    expect(titles).not.toContain("Model Year");
    expect(titles).toContain("Serial Number");
  });
});
