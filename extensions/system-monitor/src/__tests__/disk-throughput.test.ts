import { describe, expect, it } from "vitest";

import { parseIostatSample } from "../lib/disk-throughput";

describe("parseIostatSample", () => {
  it("parses the latest iostat data row", () => {
    const parsed = parseIostatSample(`              disk0
    KB/t  tps  MB/s
   32.00   10  0.31
   28.50   12  0.33`);

    expect(parsed).toEqual({
      kilobytesPerTransfer: 28.5,
      transfersPerSecond: 12,
      megabytesPerSecond: 0.33,
    });
  });

  it("returns null for empty output", () => {
    expect(parseIostatSample("")).toBeNull();
  });
});
