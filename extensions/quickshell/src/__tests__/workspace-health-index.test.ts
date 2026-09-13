import { describe, expect, it } from "vitest";
import type { Workspace } from "../lib/schema";
import { DEFAULT_SETTINGS } from "../lib/schema";
import { buildWorkspaceHealthIndex, lookupWorkspaceHealth } from "../lib/workspace-health-index";
import { assessWorkspaceHealthForList } from "../lib/workspace-health";

const workspace: Workspace = {
  id: "1",
  name: "Frontend",
  abbreviation: "fe",
  directory: "C:\\Projects\\web",
  isPinned: false,
  pinOrder: null,
  lastUsedUtc: null,
  terminal: "wt",
  wtProfile: null,
  command: "npm run dev",
  runAsAdmin: false,
  launches: [
    {
      id: "1a",
      label: "Web",
      terminal: "wt",
      wtProfile: null,
      command: "npm run dev",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
      taskType: "none",
    },
  ],
};

describe("workspace-health-index", () => {
  it("reuses cached list health for repeated lookups", () => {
    const index = buildWorkspaceHealthIndex([workspace], DEFAULT_SETTINGS);
    const first = lookupWorkspaceHealth(index, workspace, DEFAULT_SETTINGS);
    const second = lookupWorkspaceHealth(index, workspace, DEFAULT_SETTINGS);
    expect(first).toBe(second);
    expect(first.ok).toBe(assessWorkspaceHealthForList(workspace, DEFAULT_SETTINGS).ok);
  });

  it("recomputes health when launch inputs change", () => {
    const index = buildWorkspaceHealthIndex([workspace], DEFAULT_SETTINGS);
    const updated = {
      ...workspace,
      launches: workspace.launches.map((launch) => ({ ...launch, command: "" })),
    };
    const cached = lookupWorkspaceHealth(index, updated, DEFAULT_SETTINGS);
    const fresh = assessWorkspaceHealthForList(updated, DEFAULT_SETTINGS);
    expect(cached).toEqual(fresh);
    expect(cached).not.toBe(lookupWorkspaceHealth(index, workspace, DEFAULT_SETTINGS));
  });
});
