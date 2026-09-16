import { describe, expect, it, vi } from "vitest";
import { actOnResource, listResources } from "../src/core/resources";

const routine = {
  id: "routine-1",
  name: "Fixture routine",
  prompt: "Reply fixture only",
  isEnabled: true,
  triggerDescription: "Daily",
};
const selected = {
  id: routine.id,
  name: routine.name,
  text: routine.prompt,
  enabled: true,
  schedule: "Daily",
};
describe("routine and skill operations", () => {
  it("parses the live-verified routine fields", async () => {
    const command = vi.fn().mockResolvedValue([routine]);
    expect(await listResources({ command }, "bot", "routines")).toEqual([
      selected,
    ]);
  });
  it("parses skill instructions separately", async () => {
    const command = vi
      .fn()
      .mockResolvedValue([
        { id: "skill", name: "Skill", body: "Instructions" },
      ]);
    expect(await listResources({ command }, "bot", "skills")).toEqual([
      {
        id: "skill",
        name: "Skill",
        text: "Instructions",
        enabled: undefined,
        schedule: "",
      },
    ]);
  });
  it.each([
    null,
    [null],
    [{ ...routine, isEnabled: null }],
    [{ ...routine, prompt: null }],
  ])("rejects invalid resource contracts", async (response) => {
    await expect(
      listResources(
        { command: vi.fn().mockResolvedValue(response) },
        "bot",
        "routines",
      ),
    ).rejects.toThrow();
  });
  it("rechecks saved instructions before running the exact routine", async () => {
    const command = vi
      .fn()
      .mockResolvedValueOnce([routine])
      .mockResolvedValue(null);
    await actOnResource({ command }, "bot", "routines", selected, "run");
    expect(command.mock.calls[1]).toEqual([
      "runAgentAutomationNow",
      { id: "bot", automationId: "routine-1" },
      { mutation: true },
    ]);
  });
  it("sets an explicit new enabled state", async () => {
    const command = vi
      .fn()
      .mockResolvedValueOnce([routine])
      .mockResolvedValue(null);
    await actOnResource({ command }, "bot", "routines", selected, "toggle");
    expect(command.mock.calls[1]).toEqual([
      "setAgentAutomationEnabled",
      { id: "bot", automationId: "routine-1", isEnabled: false },
      { mutation: true },
    ]);
  });
  it("runs the selected workflow with the correct identifier key", async () => {
    const command = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "skill", name: "Skill", body: "Instructions" },
      ])
      .mockResolvedValue(null);
    await actOnResource(
      { command },
      "bot",
      "skills",
      { id: "skill", name: "Skill", text: "Instructions", schedule: "" },
      "run",
    );
    expect(command.mock.calls[1]).toEqual([
      "runAgentWorkflowNow",
      { id: "bot", workflowId: "skill" },
      { mutation: true },
    ]);
  });
  it("does not toggle a skill as if it were a routine", async () => {
    const command = vi.fn();
    await expect(
      actOnResource({ command }, "bot", "skills", selected, "toggle"),
    ).rejects.toThrow("schedules");
    expect(command).not.toHaveBeenCalled();
  });
  it.each([
    { prompt: "Different instructions" },
    { name: "Renamed" },
    { isEnabled: false },
    { triggerDescription: "Changed" },
    { id: "other" },
  ])("blocks changes between display and execution %j", async (change) => {
    const command = vi.fn().mockResolvedValue([{ ...routine, ...change }]);
    await expect(
      actOnResource({ command }, "bot", "routines", selected, "run"),
    ).rejects.toThrow("changed");
    expect(command).toHaveBeenCalledTimes(1);
  });
});
