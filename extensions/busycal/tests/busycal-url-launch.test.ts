import assert from "node:assert/strict";
import test from "node:test";
import { busyCalURLLaunchArguments } from "../src/busycal-url-launch";

test("busyCalURLLaunchArguments targets the resolved BusyCal app when a path is available", () => {
  assert.deepEqual(
    busyCalURLLaunchArguments(
      "/Applications/BusyCal.app",
      "busycalevent://new/Lunch%20with%20John%20tomorrow%20at%202pm",
    ),
    [
      "-a",
      "/Applications/BusyCal.app",
      "busycalevent://new/Lunch%20with%20John%20tomorrow%20at%202pm",
    ],
  );
});

test("busyCalURLLaunchArguments falls back to Launch Services when no app path is known", () => {
  assert.deepEqual(
    busyCalURLLaunchArguments(
      "",
      "busycalevent://new/Lunch%20with%20John%20tomorrow%20at%202pm",
    ),
    ["busycalevent://new/Lunch%20with%20John%20tomorrow%20at%202pm"],
  );
});
