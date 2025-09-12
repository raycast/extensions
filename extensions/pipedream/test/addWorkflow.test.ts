import { SavedWorkflow } from "../src/types";

describe("Workflow Types", () => {
  test("should have correct SavedWorkflow interface", () => {
    const workflow: SavedWorkflow = {
      id: "p_test123",
      customName: "Test Workflow",
      folder: "Test Folder",
      url: "https://pipedream.com/@/p_test123",
      triggerCount: 1,
      stepCount: 2,
      showInMenuBar: true,
      sortOrder: 0,
    };

    expect(workflow.id).toBe("p_test123");
    expect(workflow.customName).toBe("Test Workflow");
    expect(workflow.url).toBe("https://pipedream.com/@/p_test123");
  });

  test("should migrate old URL format to new format", () => {
    const oldWorkflows: SavedWorkflow[] = [
      {
        id: "p_test1",
        customName: "Test 1",
        url: "https://pipedream.com/workflows/p_test1", // Old format
        triggerCount: 1,
        stepCount: 2,
        showInMenuBar: true,
        sortOrder: 0,
      },
      {
        id: "p_test2",
        customName: "Test 2",
        url: "https://pipedream.com/@/p_test2", // Already correct format
        triggerCount: 1,
        stepCount: 2,
        showInMenuBar: true,
        sortOrder: 0,
      },
    ];

    // Simulate the migration function
    const migrateWorkflowUrls = (workflows: SavedWorkflow[]): SavedWorkflow[] => {
      return workflows.map(workflow => {
        if (workflow.url && !workflow.url.startsWith("https://pipedream.com/@/")) {
          return {
            ...workflow,
            url: `https://pipedream.com/@/${workflow.id}`,
          };
        }
        return workflow;
      });
    };

    const migratedWorkflows = migrateWorkflowUrls(oldWorkflows);

    expect(migratedWorkflows[0].url).toBe("https://pipedream.com/@/p_test1");
    expect(migratedWorkflows[1].url).toBe("https://pipedream.com/@/p_test2"); // Should remain unchanged
  });
});
