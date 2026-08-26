import { describe, expect, it, vi } from "vitest";
import type { AgentSnapshot } from "../src/protocol";

const loadSnapshot = vi.fn<() => Promise<AgentSnapshot>>();

vi.mock("../src/appfreezer", () => ({
  loadSnapshot: (...arguments_: []) => loadSnapshot(...arguments_),
}));

const { default: listApplications } = await import("../src/tools/list-applications");

const snapshot: AgentSnapshot = {
  protocolVersion: 4,
  generatedAt: "2026-07-30T12:00:00Z",
  applications: [
    {
      id: "running-id",
      name: "Running App",
      cpuPercent: 12.5,
      memoryPercent: 8.25,
      status: "running",
      canPause: true,
      canQuit: true,
    },
    {
      id: "paused-id",
      name: "Paused App",
      cpuPercent: 0,
      memoryPercent: 4.1,
      status: "paused",
      canPause: true,
      canQuit: true,
    },
  ],
};

describe("listApplications tool", () => {
  it("returns every known application when no status filter is given", async () => {
    loadSnapshot.mockResolvedValueOnce(snapshot);
    const result = await listApplications({});
    expect(result.count).toBe(2);
    expect(result.applications.map((application) => application.name)).toEqual(["Running App", "Paused App"]);
  });

  it("filters by status without exposing internal identifiers", async () => {
    loadSnapshot.mockResolvedValueOnce(snapshot);
    const result = await listApplications({ status: "paused" });
    expect(result.count).toBe(1);
    expect(result.applications[0]).toEqual({
      name: "Paused App",
      status: "paused",
      cpuPercent: 0,
      memoryPercent: 4.1,
    });
    expect(result.applications[0]).not.toHaveProperty("id");
  });

  it("propagates errors from the native agent instead of hiding them", async () => {
    loadSnapshot.mockRejectedValueOnce(new Error("App Freezer is not installed."));
    await expect(listApplications({})).rejects.toThrow("App Freezer is not installed.");
  });
});
