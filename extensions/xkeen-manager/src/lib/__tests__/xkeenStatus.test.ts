import { describe, expect, test } from "vitest";

import { parseXkeenStatus } from "../xkeenStatus";

describe("parseXkeenStatus", () => {
  test("parses a running Russian status with mode", () => {
    expect(parseXkeenStatus("Прокси-клиент xray запущен в режиме Mixed")).toEqual({
      isRunning: true,
      isStopped: false,
      mode: "Mixed",
    });
  });

  test("parses a stopped Russian status", () => {
    expect(parseXkeenStatus("Прокси-клиент xray не запущен")).toEqual({
      isRunning: false,
      isStopped: true,
      mode: "Unknown",
    });
  });

  test("parses a running English status with mode", () => {
    expect(parseXkeenStatus("xray is running in mode Direct")).toEqual({
      isRunning: true,
      isStopped: false,
      mode: "Direct",
    });
  });

  test("parses a stopped English status ('stopped')", () => {
    expect(parseXkeenStatus("xray service is stopped")).toEqual({
      isRunning: false,
      isStopped: true,
      mode: "Unknown",
    });
  });

  test("parses a stopped English status ('not running')", () => {
    expect(parseXkeenStatus("xray is not running")).toEqual({
      isRunning: false,
      isStopped: true,
      mode: "Unknown",
    });
  });

  test("returns not-running/not-stopped with Unknown mode for empty input", () => {
    expect(parseXkeenStatus("")).toEqual({
      isRunning: false,
      isStopped: false,
      mode: "Unknown",
    });
  });

  test("treats an unrecognized status as neither running nor stopped", () => {
    expect(parseXkeenStatus("some garbage output")).toEqual({
      isRunning: false,
      isStopped: false,
      mode: "Unknown",
    });
  });
});
