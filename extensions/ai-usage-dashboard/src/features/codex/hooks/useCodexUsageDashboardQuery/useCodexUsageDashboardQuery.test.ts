import { describe, expect, it } from "vitest";
import {
  codexUsageDashboardQueryKeys,
  useCodexUsageDashboardQuery,
} from "./useCodexUsageDashboardQuery";

describe("codexUsageDashboardQueryKeys", () => {
  it("namespaces codex dashboard data independently", () => {
    expect(codexUsageDashboardQueryKeys.codex()).toEqual([
      "usageDashboard",
      "codex",
    ]);
  });
});

describe("useCodexUsageDashboardQuery", () => {
  it("is exported as a dedicated Codex query hook", () => {
    expect(useCodexUsageDashboardQuery).toEqual(expect.any(Function));
  });
});
