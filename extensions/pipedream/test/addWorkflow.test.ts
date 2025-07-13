import { SavedWorkflow } from "../src/types";

describe("Workflow Types", () => {
  it("should have correct SavedWorkflow interface", () => {
    const workflow: SavedWorkflow = {
      id: "w1",
      customName: "Test",
      folder: "",
      url: "http://test",
      triggerCount: 0,
      stepCount: 0,
      showInMenuBar: false,
      sortOrder: 0,
    };

    expect(workflow.id).toBe("w1");
    expect(workflow.customName).toBe("Test");
    expect(workflow.triggerCount).toBe(0);
    expect(workflow.stepCount).toBe(0);
  });
});
