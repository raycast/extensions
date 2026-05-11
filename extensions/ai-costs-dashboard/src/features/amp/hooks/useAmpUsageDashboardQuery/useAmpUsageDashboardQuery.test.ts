import { describe, expect, it } from "vitest";
import {
  ampUsageDashboardQueryKeys,
  useAmpUsageDashboardQuery,
} from "./useAmpUsageDashboardQuery";

describe("ampUsageDashboardQueryKeys", () => {
  it("namespaces AMP dashboard data independently", () => {
    expect(ampUsageDashboardQueryKeys.amp()).toEqual(["usageDashboard", "amp"]);
  });
});

describe("useAmpUsageDashboardQuery", () => {
  it("is exported as a dedicated AMP query hook", () => {
    expect(useAmpUsageDashboardQuery).toEqual(expect.any(Function));
  });
});
