import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTION_ICON_OVERRIDES, getActionCategoryIconName, getActionIconName } from "./action-icons";

describe("BTT action icons", () => {
  it("restores every hand-picked icon from the original action list", () => {
    assert.equal(Object.keys(ACTION_ICON_OVERRIDES).length, 162);
    assert.equal(getActionIconName({ id: 1, name: "Middle Click", category: "Mouse & Trackpad Actions" }), "Mouse");
    assert.equal(
      getActionIconName({ id: 203, name: "Show Clipboard Manager", category: "Clipboard Actions" }),
      "Clipboard",
    );
    assert.equal(
      getActionIconName({ id: 281, name: "Run Core JavaScript", category: "Script Execution" }),
      "CodeBlock",
    );
  });

  it("prefers an action override over name and category inference", () => {
    assert.equal(getActionIconName({ id: 1, name: "Run JavaScript", category: "Script Execution" }), "Mouse");
  });

  it("infers specific icons from the names of new actions", () => {
    assert.equal(getActionIconName({ id: 999, name: "Take Screenshot of Area", category: "System Actions" }), "Camera");
    assert.equal(getActionIconName({ id: 998, name: "Run Shell Task", category: "Custom Actions" }), "Terminal");
    assert.equal(getActionIconName({ id: 997, name: "Set Variable", category: "Custom Actions" }), "TextCursor");
  });

  it("uses category icons after name inference and a command icon for unknown categories", () => {
    assert.equal(getActionIconName({ id: 999, name: "Adjust", category: "Display & Brightness" }), "Sun");
    assert.equal(getActionIconName({ id: 999, name: "Do Something", category: "Future Actions" }), "CommandSymbol");
  });

  it("exposes the same category icons for filter controls", () => {
    assert.equal(getActionCategoryIconName("Clipboard Actions"), "Clipboard");
    assert.equal(getActionCategoryIconName("Future Actions"), "CommandSymbol");
  });
});
