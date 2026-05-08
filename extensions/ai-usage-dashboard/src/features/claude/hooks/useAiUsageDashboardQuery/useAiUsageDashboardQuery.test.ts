import { describe, expect, it } from "vitest";
import { aiUsageDashboardQueryKeys } from "./useAiUsageDashboardQuery";

describe("aiUsageDashboardQueryKeys", () => {
  it("namespaces claude dashboard data independently", () => {
    expect(aiUsageDashboardQueryKeys.claude()).toEqual([
      "usageDashboard",
      "claude",
    ]);
  });

  it("does not expose a generic provider key builder", () => {
    expect(aiUsageDashboardQueryKeys).not.toHaveProperty("provider");
  });
});
