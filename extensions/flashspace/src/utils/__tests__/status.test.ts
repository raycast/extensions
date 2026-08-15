import { describe, expect, it } from "vitest";
import { buildStatusItems } from "../status";

describe("status helpers", () => {
  it("BUG 7: should route profile/workspace/app rows to their related commands", () => {
    expect(
      buildStatusItems({
        activeProfile: "Work",
        activeWorkspace: "Terminal",
        activeApp: "iTerm2",
        activeDisplay: "Built-in Retina Display",
      }),
    ).toEqual([
      { title: "Active Profile", value: "Work", destination: "profiles" },
      { title: "Active Workspace", value: "Terminal", destination: "workspaces" },
      { title: "Active App", value: "iTerm2", destination: "apps" },
      { title: "Active Display", value: "Built-in Retina Display", destination: "copy" },
    ]);
  });

  it("should fall back to N/A when a status value is missing", () => {
    expect(buildStatusItems({})).toEqual([
      { title: "Active Profile", value: "N/A", destination: "profiles" },
      { title: "Active Workspace", value: "N/A", destination: "workspaces" },
      { title: "Active App", value: "N/A", destination: "apps" },
      { title: "Active Display", value: "N/A", destination: "copy" },
    ]);
  });
});
