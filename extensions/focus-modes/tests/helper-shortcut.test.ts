import { describe, expect, it } from "vitest";
import { buildHelperShortcut, newHelperName, parseShortcutList, trustedHelperIds } from "../src/helper-shortcut";

const A = "3E1873F3-879B-41ED-82AA-DF5AD443616E";
const B = "98662C7A-815A-4836-9767-916743B48A0E";
const C = "1AD0A429-0BE3-4EC9-9EB9-6F4C45CE9F57";

describe("parseShortcutList", () => {
  it("reads each shortcut's exact name and identifier", () => {
    const output = [
      `Raycast Focus Modes 4F7A2C (${A})`,
      `Raycast Focus Modes (${B})`,
      `Name (with) parentheses (${C})`,
      "",
    ].join("\n");
    expect(parseShortcutList(output)).toEqual([
      { name: "Raycast Focus Modes 4F7A2C", id: A },
      { name: "Raycast Focus Modes", id: B },
      { name: "Name (with) parentheses", id: C },
    ]);
  });
});

describe("newHelperName", () => {
  it("adds a random code so no existing shortcut shares the name", () => {
    const names = Array.from({ length: 50 }, newHelperName);
    for (const name of names) expect(name).toMatch(/^Raycast Focus Modes [0-9A-F]{6}$/);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("trustedHelperIds", () => {
  it("never returns a shortcut the extension didn't add", () => {
    expect(trustedHelperIds([A, B], [B])).toEqual([B]);
    expect(trustedHelperIds([A, B], [])).toEqual([]);
  });

  it("puts the newest trusted copy first and skips deleted ones", () => {
    expect(trustedHelperIds([A, B], [C, B, A])).toEqual([A, B]);
  });
});

describe("buildHelperShortcut", () => {
  const modes = [
    { id: "com.apple.donotdisturb.mode.default", name: "Do Not Disturb" },
    { id: "com.apple.focus.work", name: "Work" },
  ];
  const actions = buildHelperShortcut(modes).WFWorkflowActions;
  const conditions = actions
    .map((action) => action.WFWorkflowActionParameters.WFConditionalActionString)
    .filter(Boolean);
  const focusActions = actions.filter((action) => action.WFWorkflowActionIdentifier === "is.workflow.actions.dnd.set");

  it("has an on and an off branch for every mode, and no catch-all off", () => {
    expect(conditions).toEqual([
      "com.apple.donotdisturb.mode.default",
      "off:com.apple.donotdisturb.mode.default",
      "com.apple.focus.work",
      "off:com.apple.focus.work",
    ]);
  });

  it("selects Do Not Disturb by default and other modes by identifier", () => {
    expect(focusActions.map((action) => action.WFWorkflowActionParameters)).toEqual([
      { Enabled: 1 },
      { Enabled: 0 },
      { Enabled: 1, FocusModes: { Identifier: "com.apple.focus.work", DisplayString: "Work" } },
      { Enabled: 0, FocusModes: { Identifier: "com.apple.focus.work", DisplayString: "Work" } },
    ]);
  });

  it("answers unknown for modes it wasn't built with", () => {
    const last = actions[actions.length - 1];
    expect(last.WFWorkflowActionIdentifier).toBe("is.workflow.actions.output");
    expect(last.WFWorkflowActionParameters.WFOutput).toMatchObject({ Value: { string: "unknown" } });
  });
});
