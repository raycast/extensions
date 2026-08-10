import { describe, expect, it } from "vitest";

import { parseHardwareInfoCache } from "../lib/cache-validation";

describe("hardware cache validation", () => {
  it("accepts valid payloads and rejects malformed fields", () => {
    expect(
      parseHardwareInfoCache(
        JSON.stringify({
          modelName: "MacBook Pro",
          modelIdentifier: "Mac14,7",
          modelNumber: "Z16",
          modelYear: "2022",
          chip: "Apple M2",
          totalCores: "8",
          memory: "16 GB",
          serialNumber: "ABC",
          gpuChipset: "Apple M2",
          gpuCores: "8",
          gpuMemory: "Shared (16 GB system memory)",
          isUnifiedMemory: true,
        }),
      ),
    ).toMatchObject({ modelName: "MacBook Pro" });

    expect(parseHardwareInfoCache(JSON.stringify({ modelName: 42 }))).toBeUndefined();
    expect(parseHardwareInfoCache("{not-json")).toBeUndefined();
    expect(parseHardwareInfoCache("null")).toBeUndefined();
  });
});
