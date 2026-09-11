import { describe, expect, it } from "vitest";
import { isApplicationSortMode, sortApplications } from "../src/application-sort";
import { AppFreezerApplication } from "../src/protocol";

const applications: AppFreezerApplication[] = [
  {
    id: "beta",
    name: "Beta",
    cpuPercent: 8,
    memoryPercent: 3,
    status: "running",
    canPause: true,
    canQuit: true,
  },
  {
    id: "alpha",
    name: "Alpha",
    cpuPercent: 2,
    memoryPercent: 9,
    status: "paused",
    canPause: true,
    canQuit: true,
  },
  {
    id: "gamma",
    name: "Gamma",
    cpuPercent: 8,
    memoryPercent: 1,
    status: "running",
    canPause: true,
    canQuit: true,
  },
];

describe("sortApplications", () => {
  it("sorts names ascending", () => {
    expect(sortApplications(applications, "name").map((app) => app.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("sorts CPU and memory descending with names as the tie breaker", () => {
    expect(sortApplications(applications, "cpu").map((app) => app.name)).toEqual(["Beta", "Gamma", "Alpha"]);
    expect(sortApplications(applications, "memory").map((app) => app.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});

describe("isApplicationSortMode", () => {
  it("accepts only the known dropdown values", () => {
    expect(isApplicationSortMode("name")).toBe(true);
    expect(isApplicationSortMode("cpu")).toBe(true);
    expect(isApplicationSortMode("memory")).toBe(true);
    expect(isApplicationSortMode("unknown")).toBe(false);
  });
});
