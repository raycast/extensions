import { describe, expect, it } from "vitest";
import { getProviderList } from "./provider";

describe("provider", () => {
  it("should be able to list providers", async () => {
    const res = await getProviderList();
    expect(res.length).toBeGreaterThan(0);
  });
});
