import type { AsyncState } from "@raycast/utils";
import { describe, expect, it } from "vite-plus/test";
import { getEmptyView } from "../src/lib/dashboard-state";
import { type Dashboard, MetrixError } from "../src/lib/metrix";

const dashboards: Dashboard[] = [{ id: "a", enabled: true }];

describe("dashboard list feedback", () => {
  it.each<AsyncState<Dashboard[]>>([
    { isLoading: true },
    { isLoading: true, data: dashboards },
    { isLoading: true, error: new MetrixError("unavailable", "Old error") },
  ])("prioritizes loading feedback while entering or retrying", (state) => {
    expect(getEmptyView(state)).toEqual({ title: "Loading Dashboards…" });
  });

  it.each([
    ["configuration", "Check Connection Preferences"],
    ["authentication", "Authentication Failed"],
    ["unavailable", "Could Not Connect to Metrix.Bar"],
    ["timeout", "Connection Timed Out"],
    ["response", "Could Not Load Dashboards"],
  ] as const)("explains %s errors", (kind, title) => {
    expect(getEmptyView({ isLoading: false, error: new MetrixError(kind, "Recovery instructions") })).toEqual({
      title,
      description: "Recovery instructions",
    });
  });

  it("distinguishes an empty installation from a search with no matches", () => {
    expect(getEmptyView({ isLoading: false, data: [] }).title).toBe("No Dashboards Installed");
    expect(getEmptyView({ isLoading: false, data: dashboards }).title).toBe("No Matching Dashboards");
  });

  it("keeps unexpected internal errors out of user-facing feedback", () => {
    expect(getEmptyView({ isLoading: false, error: new Error("private response") })).toEqual({
      title: "Could Not Load Dashboards",
      description: "Refresh dashboards and try again.",
    });
  });
});
