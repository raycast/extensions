import { describe, expect, it } from "vite-plus/test";
import { dashboardSettingsURL, dashboardURL } from "../src/lib/deeplinks";

describe("dashboard navigation", () => {
  it("opens an enabled dashboard panel even when its worker reports an error", () => {
    const dashboard = { id: "official--github-repo", enabled: true, status: "error" };
    expect(dashboardURL(dashboard)).toBe("metrixbar://panel/official--github-repo");
  });

  it("opens settings for disabled dashboards without enabling them", () => {
    expect(dashboardURL({ id: "official--github-repo", enabled: false })).toBe(
      "metrixbar://open/official--github-repo",
    );
    expect(dashboardSettingsURL("official--github-repo")).toBe("metrixbar://open/official--github-repo");
  });

  it("preserves opaque instance IDs as one encoded path segment", () => {
    const id = "Mixed.ID 看板📊?#%";
    const url = dashboardURL({ id, enabled: true });
    expect(url).toBe("metrixbar://panel/Mixed.ID%20%E7%9C%8B%E6%9D%BF%F0%9F%93%8A%3F%23%25");
    expect(decodeURIComponent(new URL(url).pathname.slice(1))).toBe(id);
  });

  it.each(["", ".", "..", "a/b", "a\\b", "a\0b", "a\ud800", "\udc00b"])("rejects ambiguous ID %j", (id) => {
    expect(() => dashboardURL({ id, enabled: true })).toThrow("Invalid dashboard ID");
    expect(() => dashboardSettingsURL(id)).toThrow("Invalid dashboard ID");
  });
});
