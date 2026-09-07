import { Action, Icon } from "@raycast/api";
import { describe, expect, it } from "vitest";
import {
  getActionDefinition,
  isRegisteredAction,
  registerAction,
  registeredActionPrefixes,
  registeredActionNames,
} from "../src/actions";
import { parseReferenceYaml } from "../src/parser";

describe("action registry", () => {
  it("contains the default actions", () => {
    expect(registeredActionNames()).toEqual(["open", "ssh", "obsidian", "pwd"]);
    expect(registeredActionPrefixes()).toEqual(["application/", "raycast/script/"]);
    expect(getActionDefinition("pwd")?.sensitive).toBe(true);
  });

  it("registers a custom action under its YAML annotation", () => {
    registerAction({
      name: "test-action",
      title: "Test Action",
      icon: Icon.Hammer,
      render: (target) => <Action.CopyToClipboard title="Test Action" content={target} />,
    });
    expect(isRegisteredAction("test-action")).toBe(true);
    const result = parseReferenceYaml(
      "examples:\n  demo:\n    field:\n      value: hello\n      test-action: world\n",
      "custom.yaml",
    );
    expect(result.records[0].fields[0].actions).toContainEqual({
      kind: "test-action",
      target: "world",
    });
  });

  it("rejects invalid and duplicate names", () => {
    expect(() =>
      registerAction({
        name: "Invalid Name",
        title: "Invalid",
        icon: Icon.XMarkCircle,
        render: (target) => <Action.CopyToClipboard content={target} />,
      }),
    ).toThrow("Invalid Quick Groups action name");
    expect(() =>
      registerAction({
        name: "open",
        title: "Duplicate",
        icon: Icon.XMarkCircle,
        render: (target) => <Action.CopyToClipboard content={target} />,
      }),
    ).toThrow('Quick Groups action "open" is already registered');
  });
});
