import { Icon } from "@raycast/api";
import { describe, expect, it } from "vitest";
import { getActionDefinition, registerScriptCommandAction } from "../src/actions";

describe("registerScriptCommandAction", () => {
  it("passes the resolved target as the first argument by default", () => {
    registerScriptCommandAction({
      name: "test-project-script",
      title: "Open Project",
      command: "open-project",
      icon: Icon.Folder,
    });
    const action = getActionDefinition("test-project-script")?.render("/Projects/My Project");
    expect(action?.props).toMatchObject({
      title: "Open Project",
      target: "raycast://script-commands/open-project?arguments=%2FProjects%2FMy%20Project",
    });
  });

  it("supports custom argument mapping", () => {
    registerScriptCommandAction({
      name: "test-project-environment",
      title: "Open Project Environment",
      command: "open-project",
      arguments: (target) => [target, "development"],
    });
    const action = getActionDefinition("test-project-environment")?.render("reference");
    expect(action?.props.target).toBe(
      "raycast://script-commands/open-project?arguments=reference&arguments=development",
    );
  });

  it("rejects more than Raycast's three supported arguments", () => {
    registerScriptCommandAction({
      name: "test-too-many-arguments",
      title: "Too Many",
      command: "too-many",
      arguments: () => ["1", "2", "3", "4"],
    });
    expect(() => getActionDefinition("test-too-many-arguments")?.render("target")).toThrow(
      "more than three arguments",
    );
  });
});
