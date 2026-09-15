import { describe, expect, it } from "vitest";
import { formatBinaryBytes, formatDuration, formatSpeed } from "../src/presentation/format";

describe("formatSpeed", () => {
  it.each([
    [99.94, "99.9 MB/s"],
    [999, "999 MB/s"],
    [1_000, "1.00 GB/s"],
    [1_891, "1.89 GB/s"],
    [5_219, "5.22 GB/s"],
    [10_981, "10.98 GB/s"],
  ])("formats %f MB/s as %s", (speed, expected) => {
    expect(formatSpeed(speed)).toBe(expected);
  });
});

describe("formatBinaryBytes", () => {
  it.each([
    [256 * 1_048_576, "256 MiB"],
    [512 * 1_048_576, "512 MiB"],
    [1_024 * 1_048_576, "1 GiB"],
    [2_048 * 1_048_576, "2 GiB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatBinaryBytes(bytes)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [1, "1 second"],
    [25, "25 seconds"],
    [45, "45 seconds"],
    [60, "1 minute"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
